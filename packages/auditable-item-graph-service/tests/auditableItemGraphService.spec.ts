// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { RandomHelper } from "@gtsc/core";
import { MemoryEntityStorageConnector } from "@gtsc/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@gtsc/entity-storage-models";
import {
	EntityStorageImmutableStorageConnector,
	type ImmutableItem,
	initSchema as initSchemaImmutableStorage
} from "@gtsc/immutable-storage-connector-entity-storage";
import { ImmutableStorageConnectorFactory } from "@gtsc/immutable-storage-models";
import { nameof } from "@gtsc/nameof";
import { type IProperty, PropertyHelper } from "@gtsc/schema";
import {
	decodeJwtToIntegrity,
	setupTestEnv,
	TEST_USER_IDENTITY,
	TEST_NODE_IDENTITY
} from "./setupTestEnv";
import { AuditableItemGraphService } from "../src/auditableItemGraphService";
import type { AuditableItemGraphVertex } from "../src/entities/auditableItemGraphVertex";
import { initSchema } from "../src/schema";

let vertexStorage: MemoryEntityStorageConnector<AuditableItemGraphVertex>;
let immutableStorage: MemoryEntityStorageConnector<ImmutableItem>;

const FIRST_TICK = 1724327716271;
const SECOND_TICK = 1724327816272;

describe("AuditableItemGraphService", () => {
	beforeAll(async () => {
		await setupTestEnv();

		initSchema();
		initSchemaImmutableStorage();
	});

	beforeEach(async () => {
		vertexStorage = new MemoryEntityStorageConnector<AuditableItemGraphVertex>({
			entitySchema: nameof<AuditableItemGraphVertex>()
		});

		EntityStorageConnectorFactory.register("vertex", () => vertexStorage);

		immutableStorage = new MemoryEntityStorageConnector<ImmutableItem>({
			entitySchema: nameof<ImmutableItem>()
		});
		EntityStorageConnectorFactory.register("immutable-storage", () => immutableStorage);

		ImmutableStorageConnectorFactory.register(
			"auditable-item-graph",
			() => new EntityStorageImmutableStorageConnector()
		);

		Date.now = vi
			.fn()
			.mockImplementationOnce(() => FIRST_TICK)
			.mockImplementation(() => SECOND_TICK);
		RandomHelper.generate = vi
			.fn()
			.mockImplementationOnce(length => new Uint8Array(length).fill(1))
			.mockImplementationOnce(length => new Uint8Array(length).fill(2))
			.mockImplementationOnce(length => new Uint8Array(length).fill(3))
			.mockImplementationOnce(length => new Uint8Array(length).fill(4))
			.mockImplementation(length => new Uint8Array(length).fill(5));
	});

	test("Can create an instance", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		expect(service).toBeDefined();
	});

	test("Can create a vertex with no properties", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			undefined,
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "/HoaRSM9VVpFXI8alMy2SG1L91F9Jix4Xfcd4cEr9HM=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				}
			]
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			vertex.changesets?.[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		const { signature, integrity } = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(signature).toEqual(
			"TIybptCMNss2R/4DdbTZUrcghNwFQ7NdZ/C7sXSds/kkM7p+IeDQigoT/7QPif9/mlfa4IJj6XYJTUzD07dNBw=="
		);
		expect(integrity.userIdentity).toEqual(TEST_USER_IDENTITY);
		expect(integrity.changes).toEqual([]);
	});

	test("Can create a vertex with an alias", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			[{ id: "foo123" }, { id: "bar456" }],
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			aliasIndex: "foo123||bar456",
			aliases: [
				{
					id: "foo123",
					created: FIRST_TICK
				},
				{
					id: "bar456",
					created: FIRST_TICK
				}
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "GTZhAbOqfVvVGylIndMexE+7bcgidGB3j7JBY4Q0EC4=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				}
			]
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			vertex.changesets?.[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		const { signature, integrity } = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(signature).toEqual(
			"98cuw4/8kxYmdvRsAH31F2wXwbTdPYi3Tscl2szaaadqDoJ9k4CeTmkWJB3KseJ9wGO0VpsD7o04zRaD/bxJAA=="
		);

		expect(integrity).toEqual({
			changes: [
				{
					itemType: "alias",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "foo123"
					}
				},
				{
					itemType: "alias",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "bar456"
					}
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});
	});

	test("Can create a vertex with some metadata", async () => {
		const metadata: IProperty[] = [];
		PropertyHelper.setText(metadata, "description", "This is a test");
		PropertyHelper.setInteger(metadata, "counter", 123);

		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			undefined,
			metadata,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: [
				{
					id: "description",
					type: "https://schema.org/Text",
					value: "This is a test",
					created: FIRST_TICK
				},
				{
					id: "counter",
					type: "https://schema.org/Integer",
					value: 123,
					created: FIRST_TICK
				}
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "iJQa2u1z1i7qWsM4jr4pr5DDJjat4ES/SDj8jOw8eYI=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				}
			]
		});
		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			vertex.changesets?.[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		const { signature, integrity } = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(signature).toEqual(
			"3Ysb05wVNQEnS+LZLcI6Q1duRzj9hlCl153rHJoEq6ePN7HQI3wD6GInTlJ9ZmL902zalPrzREROdWwukHpMCQ=="
		);

		expect(integrity).toEqual({
			changes: [
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "counter",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "description",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});
	});

	test("Can get a vertex", async () => {
		const metadata: IProperty[] = [];
		PropertyHelper.setText(metadata, "description", "This is a test");
		PropertyHelper.setInteger(metadata, "counter", 123);

		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			[{ id: "foo123" }, { id: "bar456" }],
			metadata,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const result = await service.get(id);
		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: [
				{
					id: "description",
					type: "https://schema.org/Text",
					value: "This is a test",
					created: FIRST_TICK
				},
				{
					id: "counter",
					type: "https://schema.org/Integer",
					value: 123,
					created: FIRST_TICK
				}
			],
			aliases: [
				{
					id: "foo123",
					created: FIRST_TICK
				},
				{
					id: "bar456",
					created: FIRST_TICK
				}
			]
		});
	});

	test("Can get a vertex include changesets", async () => {
		const metadata: IProperty[] = [];
		PropertyHelper.setText(metadata, "description", "This is a test");
		PropertyHelper.setInteger(metadata, "counter", 123);

		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			[{ id: "foo123" }, { id: "bar456" }],
			metadata,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const result = await service.get(id, { includeChangesets: true });
		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: [
				{
					id: "description",
					type: "https://schema.org/Text",
					value: "This is a test",
					created: FIRST_TICK
				},
				{
					id: "counter",
					type: "https://schema.org/Integer",
					value: 123,
					created: FIRST_TICK
				}
			],
			aliases: [
				{
					id: "foo123",
					created: FIRST_TICK
				},
				{
					id: "bar456",
					created: FIRST_TICK
				}
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "q+7V9GVJZdkXdNm+7RdoF7AmmcyDAmM3dLUWNYgNCL4=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				}
			]
		});
	});

	test("Can get a vertex include changesets and verify current signature", async () => {
		const metadata: IProperty[] = [];
		PropertyHelper.setText(metadata, "description", "This is a test");
		PropertyHelper.setInteger(metadata, "counter", 123);

		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			[{ id: "foo123" }, { id: "bar456" }],
			metadata,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: "current"
		});

		expect(result.verified).toEqual(true);
		expect(result.verification?.[FIRST_TICK].changes.length).toEqual(4);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: [
				{
					id: "description",
					type: "https://schema.org/Text",
					value: "This is a test",
					created: FIRST_TICK
				},
				{
					id: "counter",
					type: "https://schema.org/Integer",
					value: 123,
					created: FIRST_TICK
				}
			],
			aliases: [
				{
					id: "foo123",
					created: FIRST_TICK
				},
				{
					id: "bar456",
					created: FIRST_TICK
				}
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "q+7V9GVJZdkXdNm+7RdoF7AmmcyDAmM3dLUWNYgNCL4=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				}
			]
		});
	});

	test("Can create and update with no changes and verify", async () => {
		const metadata: IProperty[] = [];
		PropertyHelper.setText(metadata, "description", "This is a test");
		PropertyHelper.setInteger(metadata, "counter", 123);

		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			[{ id: "foo123" }, { id: "bar456" }],
			metadata,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			id,
			[{ id: "foo123" }, { id: "bar456" }],
			metadata,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: "current"
		});

		expect(result.verified).toEqual(true);
		expect(result.verification?.[FIRST_TICK].changes.length).toEqual(4);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: [
				{
					id: "description",
					type: "https://schema.org/Text",
					value: "This is a test",
					created: FIRST_TICK
				},
				{
					id: "counter",
					type: "https://schema.org/Integer",
					value: 123,
					created: FIRST_TICK
				}
			],
			aliases: [
				{
					id: "foo123",
					created: FIRST_TICK
				},
				{
					id: "bar456",
					created: FIRST_TICK
				}
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "q+7V9GVJZdkXdNm+7RdoF7AmmcyDAmM3dLUWNYgNCL4=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				}
			]
		});
	});

	test("Can create and update and verify aliases", async () => {
		const metadata: IProperty[] = [];
		PropertyHelper.setText(metadata, "description", "This is a test");
		PropertyHelper.setInteger(metadata, "counter", 123);

		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			[{ id: "foo123" }, { id: "bar456" }],
			metadata,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			id,
			[{ id: "foo321" }, { id: "bar456" }],
			metadata,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: "all"
		});

		expect(result.verified).toEqual(true);
		expect(result.verification?.[FIRST_TICK].changes.length).toEqual(4);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: [
				{
					id: "description",
					type: "https://schema.org/Text",
					value: "This is a test",
					created: FIRST_TICK
				},
				{
					id: "counter",
					type: "https://schema.org/Integer",
					value: 123,
					created: FIRST_TICK
				}
			],
			aliases: [
				{
					id: "bar456",
					created: FIRST_TICK
				},
				{
					id: "foo321",
					created: SECOND_TICK
				}
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "q+7V9GVJZdkXdNm+7RdoF7AmmcyDAmM3dLUWNYgNCL4=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
					created: SECOND_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "+odhr+HxFznI38ncgZzdmEXs2TlDThQiscAPWDDruOA=",
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
				}
			]
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			result.vertex.changesets?.[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		let credentialSignature = await decodeJwtToIntegrity(immutableStore[0].data);
		expect(credentialSignature.signature).toEqual(
			"2q1LBem6y8LvKvWhIEAAw6vDR3KyW+g7GoLRy2W27S/56HUe1buH3nOOtQNu2QavYjzYVg6e11Wv53w88JUpAw=="
		);

		expect(credentialSignature.integrity).toEqual({
			changes: [
				{
					itemType: "alias",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "foo123"
					}
				},
				{
					itemType: "alias",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "bar456"
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "counter",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "description",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});

		credentialSignature = await decodeJwtToIntegrity(immutableStore[1].data);
		expect(credentialSignature.signature).toEqual(
			"wCtHDHGxH5bQzOT5hWEKHvmXtXGOw5tpFq/I3e2oQcOPt8Yhk0qZ+N7NjRmDkjB3mpd/+SCf+7xmYdoF9QoMDA=="
		);

		expect(credentialSignature.integrity).toEqual({
			changes: [
				{
					itemType: "alias",
					operation: "delete",
					properties: {
						created: FIRST_TICK,
						id: "foo123"
					}
				},
				{
					itemType: "alias",
					operation: "add",
					properties: {
						created: SECOND_TICK,
						id: "foo321"
					}
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});
	});

	test("Can create and update and verify aliases and metadata", async () => {
		const metadata: IProperty[] = [];
		PropertyHelper.setText(metadata, "description", "This is a test");
		PropertyHelper.setInteger(metadata, "counter", 123);

		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			[{ id: "foo123" }, { id: "bar456" }],
			metadata,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		PropertyHelper.removeValue(metadata, "description");
		PropertyHelper.setText(metadata, "title", "Title");
		PropertyHelper.setInteger(metadata, "counter", 456);

		await service.update(
			id,
			[{ id: "foo321" }, { id: "bar456" }],
			metadata,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: "all"
		});

		expect(result.verified).toEqual(true);
		expect(result.verification?.[FIRST_TICK].changes.length).toEqual(4);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: [
				{
					id: "counter",
					type: "https://schema.org/Integer",
					value: 456,
					created: SECOND_TICK
				},
				{
					id: "title",
					type: "https://schema.org/Text",
					value: "Title",
					created: SECOND_TICK
				}
			],
			aliases: [
				{
					id: "bar456",
					created: FIRST_TICK
				},
				{
					id: "foo321",
					created: SECOND_TICK
				}
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "q+7V9GVJZdkXdNm+7RdoF7AmmcyDAmM3dLUWNYgNCL4=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
					created: SECOND_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "IbzfHNhg+nTmHNwliaGM7qQ/YxbRGNxQ3GSLcK7HGpM=",
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
				}
			]
		});

		const immutableStore = immutableStorage.getStore();
		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			result.vertex.changesets?.[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		let credentialSignature = await decodeJwtToIntegrity(immutableStore[0].data);
		expect(credentialSignature.signature).toEqual(
			"2q1LBem6y8LvKvWhIEAAw6vDR3KyW+g7GoLRy2W27S/56HUe1buH3nOOtQNu2QavYjzYVg6e11Wv53w88JUpAw=="
		);

		expect(credentialSignature.integrity).toEqual({
			changes: [
				{
					itemType: "alias",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "foo123"
					}
				},
				{
					itemType: "alias",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "bar456"
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "counter",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "description",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});

		credentialSignature = await decodeJwtToIntegrity(immutableStore[1].data);
		expect(credentialSignature.signature).toEqual(
			"KWNlbV1883eFg6M7c5j2NmDX9BmXyx4czJLbC9cQ6hoMu18YJQ/fcg80BFkKVDIKsC/YzPZdsL4bHtROtMEcAw=="
		);

		expect(credentialSignature.integrity).toEqual({
			changes: [
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: SECOND_TICK,
						id: "counter",
						type: "https://schema.org/Integer",
						value: 456
					}
				},
				{
					itemType: "alias",
					operation: "delete",
					properties: {
						created: FIRST_TICK,
						id: "foo123"
					}
				},
				{
					itemType: "alias",
					operation: "add",
					properties: {
						created: SECOND_TICK,
						id: "foo321"
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: SECOND_TICK,
						id: "title",
						type: "https://schema.org/Text",
						value: "Title"
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "delete",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "counter",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "delete",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "description",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});
	});

	test("Can create and update and verify aliases, metadata and resources", async () => {
		const metadata: IProperty[] = [];
		PropertyHelper.setText(metadata, "description", "This is a test");
		PropertyHelper.setInteger(metadata, "counter", 123);

		const metadataResource1: IProperty[] = [];
		PropertyHelper.setText(metadataResource1, "res-description", "This is a test");
		PropertyHelper.setInteger(metadataResource1, "res-counter", 123);

		const metadataResource2: IProperty[] = [];
		PropertyHelper.setText(metadataResource2, "res-description-2", "This is a test");
		PropertyHelper.setInteger(metadataResource2, "res-counter-2", 123);

		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			[{ id: "foo123" }, { id: "bar456" }],
			metadata,
			[
				{
					id: "resource1",
					metadata: metadataResource1
				},
				{
					id: "resource2",
					metadata: metadataResource2
				}
			],
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		PropertyHelper.removeValue(metadata, "description");
		PropertyHelper.setText(metadata, "title", "Title");
		PropertyHelper.setInteger(metadata, "counter", 456);

		PropertyHelper.removeValue(metadataResource1, "res-description");
		PropertyHelper.setText(metadataResource1, "res-title", "Title");
		PropertyHelper.setInteger(metadataResource1, "res-counter", 456);

		PropertyHelper.removeValue(metadataResource2, "res-description-2");
		PropertyHelper.setText(metadataResource2, "res-title-2", "Title");
		PropertyHelper.setInteger(metadataResource2, "res-counter-2", 456);

		await service.update(
			id,
			[{ id: "foo321" }, { id: "bar456" }],
			metadata,
			[
				{
					id: "resource1",
					metadata: metadataResource1
				},
				{
					id: "resource2",
					metadata: metadataResource2
				}
			],
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: "all"
		});

		expect(result.verified).toEqual(true);
		expect(result.verification?.[FIRST_TICK].changes.length).toEqual(10);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: [
				{
					id: "counter",
					type: "https://schema.org/Integer",
					value: 456,
					created: SECOND_TICK
				},
				{
					id: "title",
					type: "https://schema.org/Text",
					value: "Title",
					created: SECOND_TICK
				}
			],
			aliases: [
				{
					id: "bar456",
					created: FIRST_TICK
				},
				{
					id: "foo321",
					created: SECOND_TICK
				}
			],
			resources: [
				{
					id: "resource1",
					created: FIRST_TICK,
					metadata: [
						{
							id: "res-counter",
							type: "https://schema.org/Integer",
							value: 456,
							created: SECOND_TICK
						},
						{
							id: "res-title",
							type: "https://schema.org/Text",
							value: "Title",
							created: SECOND_TICK
						}
					]
				},
				{
					id: "resource2",
					created: FIRST_TICK,
					metadata: [
						{
							id: "res-counter-2",
							type: "https://schema.org/Integer",
							value: 456,
							created: SECOND_TICK
						},
						{
							id: "res-title-2",
							type: "https://schema.org/Text",
							value: "Title",
							created: SECOND_TICK
						}
					]
				}
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "MqAEB3YZu9TdDWCu0YPyFJfzmiGhnUqZy/Mb4qxEd9c=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
					created: SECOND_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "Jx0uKrqwEtxbw9DyZWHsyRFw9mpsMr3b0vCXb7MJ2SY=",
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
				}
			]
		});

		const immutableStore = immutableStorage.getStore();
		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			result.vertex.changesets?.[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		let credentialSignature = await decodeJwtToIntegrity(immutableStore[0].data);
		expect(credentialSignature.signature).toEqual(
			"GU1NnfpoHn6InfmCFWYKzfVmZzEfp/r+1ab4uAxkomiv2Slrrfe9numLOS75h1KMoMFSrFoEj7s5WGVR2mgRBg=="
		);

		expect(credentialSignature.integrity).toEqual({
			changes: [
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource2",
					properties: {
						created: FIRST_TICK,
						id: "res-description-2",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				},
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource2",
					properties: {
						created: FIRST_TICK,
						id: "res-counter-2",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "resource",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "resource1"
					}
				},
				{
					itemType: "alias",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "foo123"
					}
				},
				{
					itemType: "alias",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "bar456"
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "counter",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource1",
					properties: {
						created: FIRST_TICK,
						id: "res-counter",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource1",
					properties: {
						created: FIRST_TICK,
						id: "res-description",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "description",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				},
				{
					itemType: "resource",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "resource2"
					}
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});

		credentialSignature = await decodeJwtToIntegrity(immutableStore[1].data);
		expect(credentialSignature.signature).toEqual(
			"85TCUTuzPsO85+BZZ2LDAY8Ji1KFhT9wfZnxjnHGjaC2WkGO/PvRL0AdyX9wlFEaqRIW578G+Sx5gdpS2nd2AQ=="
		);

		expect(credentialSignature.integrity).toEqual({
			changes: [
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource2",
					properties: {
						created: SECOND_TICK,
						id: "res-counter-2",
						type: "https://schema.org/Integer",
						value: 456
					}
				},
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource1",
					properties: {
						created: SECOND_TICK,
						id: "res-title",
						type: "https://schema.org/Text",
						value: "Title"
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: SECOND_TICK,
						id: "counter",
						type: "https://schema.org/Integer",
						value: 456
					}
				},
				{
					itemType: "alias",
					operation: "delete",
					properties: {
						created: FIRST_TICK,
						id: "foo123"
					}
				},
				{
					itemType: "alias",
					operation: "add",
					properties: {
						created: SECOND_TICK,
						id: "foo321"
					}
				},
				{
					itemType: "resource-metadata",
					operation: "delete",
					parentId: "resource2",
					properties: {
						created: FIRST_TICK,
						id: "res-counter-2",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: SECOND_TICK,
						id: "title",
						type: "https://schema.org/Text",
						value: "Title"
					}
				},
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource2",
					properties: {
						created: SECOND_TICK,
						id: "res-title-2",
						type: "https://schema.org/Text",
						value: "Title"
					}
				},
				{
					itemType: "resource-metadata",
					operation: "delete",
					parentId: "resource1",
					properties: {
						created: FIRST_TICK,
						id: "res-counter",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "delete",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "counter",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "resource-metadata",
					operation: "delete",
					parentId: "resource2",
					properties: {
						created: FIRST_TICK,
						id: "res-description-2",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				},
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource1",
					properties: {
						created: SECOND_TICK,
						id: "res-counter",
						type: "https://schema.org/Integer",
						value: 456
					}
				},
				{
					itemType: "resource-metadata",
					operation: "delete",
					parentId: "resource1",
					properties: {
						created: FIRST_TICK,
						id: "res-description",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "delete",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "description",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});
	});

	test("Can create and update and verify edges", async () => {
		const metadataEdge1: IProperty[] = [];
		PropertyHelper.setText(metadataEdge1, "edge-description", "This is a test");
		PropertyHelper.setInteger(metadataEdge1, "edge-counter", 123);

		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			undefined,
			undefined,
			undefined,
			[
				{
					id: "edge1",
					relationship: "friend",
					metadata: metadataEdge1
				}
			],
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		PropertyHelper.removeValue(metadataEdge1, "edge-description");
		PropertyHelper.setText(metadataEdge1, "edge-title", "Title");
		PropertyHelper.setInteger(metadataEdge1, "edge-counter", 456);

		await service.update(
			id,
			undefined,
			undefined,
			undefined,
			[
				{
					id: "edge1",
					relationship: "frenemy",
					metadata: metadataEdge1
				}
			],
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: "all"
		});

		expect(result.verified).toEqual(true);
		expect(result.verification?.[FIRST_TICK].changes.length).toEqual(3);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			edges: [
				{
					id: "edge1",
					created: SECOND_TICK,
					relationship: "frenemy",
					metadata: [
						{
							id: "edge-counter",
							type: "https://schema.org/Integer",
							value: 456,
							created: SECOND_TICK
						},
						{
							id: "edge-title",
							type: "https://schema.org/Text",
							value: "Title",
							created: SECOND_TICK
						}
					]
				}
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "5XcAzpnzhEUx61q0MaqHZFN2WB+8s117iWxb2Osve3s=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
					created: SECOND_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "j5iTAZA1d4Skj8pRqx2usZBcFpofot4YtKYeFQtpIQ0=",
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
				}
			]
		});
	});

	test("Can create and update and verify aliases, metadata, resources and edges", async () => {
		const metadata: IProperty[] = [];
		PropertyHelper.setText(metadata, "description", "This is a test");
		PropertyHelper.setInteger(metadata, "counter", 123);

		const metadataResource1: IProperty[] = [];
		PropertyHelper.setText(metadataResource1, "res-description", "This is a test");
		PropertyHelper.setInteger(metadataResource1, "res-counter", 123);

		const metadataResource2: IProperty[] = [];
		PropertyHelper.setText(metadataResource2, "res-description-2", "This is a test");
		PropertyHelper.setInteger(metadataResource2, "res-counter-2", 123);

		const metadataEdge1: IProperty[] = [];
		PropertyHelper.setText(metadataEdge1, "edge-description", "This is a test");
		PropertyHelper.setInteger(metadataEdge1, "edge-counter", 123);

		const metadataEdge2: IProperty[] = [];
		PropertyHelper.setText(metadataEdge2, "edge-description-2", "This is a test");
		PropertyHelper.setInteger(metadataEdge2, "edge-counter-2", 123);

		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			[{ id: "foo123" }, { id: "bar456" }],
			metadata,
			[
				{
					id: "resource1",
					metadata: metadataResource1
				},
				{
					id: "resource2",
					metadata: metadataResource2
				}
			],
			[
				{
					id: "edge1",
					relationship: "friend",
					metadata: metadataEdge1
				},
				{
					id: "edge2",
					relationship: "enemy",
					metadata: metadataEdge2
				}
			],
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		PropertyHelper.removeValue(metadata, "description");
		PropertyHelper.setText(metadata, "title", "Title");
		PropertyHelper.setInteger(metadata, "counter", 456);

		PropertyHelper.removeValue(metadataResource1, "res-description");
		PropertyHelper.setText(metadataResource1, "res-title", "Title");
		PropertyHelper.setInteger(metadataResource1, "res-counter", 456);

		PropertyHelper.removeValue(metadataResource2, "res-description-2");
		PropertyHelper.setText(metadataResource2, "res-title-2", "Title");
		PropertyHelper.setInteger(metadataResource2, "res-counter-2", 456);

		PropertyHelper.removeValue(metadataEdge1, "edge-description");
		PropertyHelper.setText(metadataEdge1, "edge-title", "Title");
		PropertyHelper.setInteger(metadataEdge1, "edge-counter", 456);

		PropertyHelper.removeValue(metadataEdge2, "edge-description-2");
		PropertyHelper.setText(metadataEdge2, "edge-title-2", "Title");
		PropertyHelper.setInteger(metadataEdge2, "edge-counter-2", 456);

		await service.update(
			id,
			[{ id: "foo321" }, { id: "bar456" }],
			metadata,
			[
				{
					id: "resource1",
					metadata: metadataResource1
				},
				{
					id: "resource2",
					metadata: metadataResource2
				}
			],
			[
				{
					id: "edge1",
					relationship: "frenemy",
					metadata: metadataEdge1
				},
				{
					id: "edge2",
					relationship: "eneind",
					metadata: metadataEdge2
				}
			],
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: "all"
		});

		expect(result.verified).toEqual(true);
		expect(result.verification?.[FIRST_TICK].changes.length).toEqual(16);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: [
				{
					id: "counter",
					type: "https://schema.org/Integer",
					value: 456,
					created: SECOND_TICK
				},
				{
					id: "title",
					type: "https://schema.org/Text",
					value: "Title",
					created: SECOND_TICK
				}
			],
			aliases: [
				{
					id: "bar456",
					created: FIRST_TICK
				},
				{
					id: "foo321",
					created: SECOND_TICK
				}
			],
			resources: [
				{
					id: "resource1",
					created: FIRST_TICK,
					metadata: [
						{
							id: "res-counter",
							type: "https://schema.org/Integer",
							value: 456,
							created: SECOND_TICK
						},
						{
							id: "res-title",
							type: "https://schema.org/Text",
							value: "Title",
							created: SECOND_TICK
						}
					]
				},
				{
					id: "resource2",
					created: FIRST_TICK,
					metadata: [
						{
							id: "res-counter-2",
							type: "https://schema.org/Integer",
							value: 456,
							created: SECOND_TICK
						},
						{
							id: "res-title-2",
							type: "https://schema.org/Text",
							value: "Title",
							created: SECOND_TICK
						}
					]
				}
			],
			edges: [
				{
					id: "edge1",
					created: SECOND_TICK,
					relationship: "frenemy",
					metadata: [
						{
							id: "edge-counter",
							type: "https://schema.org/Integer",
							value: 456,
							created: SECOND_TICK
						},
						{
							id: "edge-title",
							type: "https://schema.org/Text",
							value: "Title",
							created: SECOND_TICK
						}
					]
				},
				{
					id: "edge2",
					created: SECOND_TICK,
					relationship: "eneind",
					metadata: [
						{
							id: "edge-counter-2",
							type: "https://schema.org/Integer",
							value: 456,
							created: SECOND_TICK
						},
						{
							id: "edge-title-2",
							type: "https://schema.org/Text",
							value: "Title",
							created: SECOND_TICK
						}
					]
				}
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "mkcJ/79W/7pv2I/qD0k5PznMWxDvHS650KhovJO6QA8=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
					created: SECOND_TICK,
					userIdentity: TEST_USER_IDENTITY,
					hash: "SWCb4XtEhSnzKJBuHBQUb2+MZgFiMJm+WsrPQ+hcZu0=",
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
				}
			]
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			result.vertex.changesets?.[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		let credentialSignature = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(credentialSignature.signature).toEqual(
			"7ibXR6OLiAA2j6d8lSLpgS59VBK5Uw5Ef+jMwjChmwi1vMvp43h98QItdZOGuZUUqkzOxbLxsdM2NkQ5CZ6SDw=="
		);

		expect(credentialSignature.integrity).toEqual({
			changes: [
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource2",
					properties: {
						created: FIRST_TICK,
						id: "res-description-2",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				},
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource2",
					properties: {
						created: FIRST_TICK,
						id: "res-counter-2",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "edge",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "edge1",
						relationship: "friend"
					}
				},
				{
					itemType: "resource",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "resource1"
					}
				},
				{
					itemType: "alias",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "foo123"
					}
				},
				{
					itemType: "edge",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "edge2",
						relationship: "enemy"
					}
				},
				{
					itemType: "alias",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "bar456"
					}
				},
				{
					itemType: "edge-metadata",
					operation: "add",
					parentId: "edge2",
					properties: {
						created: FIRST_TICK,
						id: "edge-counter-2",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "edge-metadata",
					operation: "add",
					parentId: "edge2",
					properties: {
						created: FIRST_TICK,
						id: "edge-description-2",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				},
				{
					itemType: "edge-metadata",
					operation: "add",
					parentId: "edge1",
					properties: {
						created: FIRST_TICK,
						id: "edge-counter",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "counter",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource1",
					properties: {
						created: FIRST_TICK,
						id: "res-counter",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource1",
					properties: {
						created: FIRST_TICK,
						id: "res-description",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				},
				{
					itemType: "edge-metadata",
					operation: "add",
					parentId: "edge1",
					properties: {
						created: FIRST_TICK,
						id: "edge-description",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "description",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				},
				{
					itemType: "resource",
					operation: "add",
					properties: {
						created: FIRST_TICK,
						id: "resource2"
					}
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});

		credentialSignature = await decodeJwtToIntegrity(immutableStore[1].data);

		expect(credentialSignature.signature).toEqual(
			"K029lG6o1C+znWmu1YjCiQLf7Drt06K5/9Ru7BgrMbsxp6xSV4Bx1BSOjalZjqCaJbHg+OBPrVMwlQPzKQPbCg=="
		);

		expect(credentialSignature.integrity).toEqual({
			changes: [
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource2",
					properties: {
						created: SECOND_TICK,
						id: "res-counter-2",
						type: "https://schema.org/Integer",
						value: 456
					}
				},
				{
					itemType: "edge",
					operation: "delete",
					properties: {
						created: FIRST_TICK,
						id: "edge1",
						relationship: "friend"
					}
				},
				{
					itemType: "edge-metadata",
					operation: "delete",
					parentId: "edge1",
					properties: {
						created: FIRST_TICK,
						id: "edge-counter",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "edge",
					operation: "add",
					properties: {
						created: SECOND_TICK,
						id: "edge1",
						relationship: "frenemy"
					}
				},
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource1",
					properties: {
						created: SECOND_TICK,
						id: "res-title",
						type: "https://schema.org/Text",
						value: "Title"
					}
				},
				{
					itemType: "edge-metadata",
					operation: "delete",
					parentId: "edge1",
					properties: {
						created: FIRST_TICK,
						id: "edge-description",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: SECOND_TICK,
						id: "counter",
						type: "https://schema.org/Integer",
						value: 456
					}
				},
				{
					itemType: "edge-metadata",
					operation: "add",
					parentId: "edge2",
					properties: {
						created: SECOND_TICK,
						id: "edge-title-2",
						type: "https://schema.org/Text",
						value: "Title"
					}
				},
				{
					itemType: "alias",
					operation: "delete",
					properties: {
						created: FIRST_TICK,
						id: "foo123"
					}
				},
				{
					itemType: "alias",
					operation: "add",
					properties: {
						created: SECOND_TICK,
						id: "foo321"
					}
				},
				{
					itemType: "resource-metadata",
					operation: "delete",
					parentId: "resource2",
					properties: {
						created: FIRST_TICK,
						id: "res-counter-2",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "add",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: SECOND_TICK,
						id: "title",
						type: "https://schema.org/Text",
						value: "Title"
					}
				},
				{
					itemType: "edge-metadata",
					operation: "add",
					parentId: "edge1",
					properties: {
						created: SECOND_TICK,
						id: "edge-counter",
						type: "https://schema.org/Integer",
						value: 456
					}
				},
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource2",
					properties: {
						created: SECOND_TICK,
						id: "res-title-2",
						type: "https://schema.org/Text",
						value: "Title"
					}
				},
				{
					itemType: "edge-metadata",
					operation: "delete",
					parentId: "edge2",
					properties: {
						created: FIRST_TICK,
						id: "edge-description-2",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				},
				{
					itemType: "edge",
					operation: "delete",
					properties: {
						created: FIRST_TICK,
						id: "edge2",
						relationship: "enemy"
					}
				},
				{
					itemType: "edge-metadata",
					operation: "delete",
					parentId: "edge2",
					properties: {
						created: FIRST_TICK,
						id: "edge-counter-2",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "resource-metadata",
					operation: "delete",
					parentId: "resource1",
					properties: {
						created: FIRST_TICK,
						id: "res-counter",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "edge-metadata",
					operation: "add",
					parentId: "edge1",
					properties: {
						created: SECOND_TICK,
						id: "edge-title",
						type: "https://schema.org/Text",
						value: "Title"
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "delete",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "counter",
						type: "https://schema.org/Integer",
						value: 123
					}
				},
				{
					itemType: "resource-metadata",
					operation: "delete",
					parentId: "resource2",
					properties: {
						created: FIRST_TICK,
						id: "res-description-2",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				},
				{
					itemType: "resource-metadata",
					operation: "add",
					parentId: "resource1",
					properties: {
						created: SECOND_TICK,
						id: "res-counter",
						type: "https://schema.org/Integer",
						value: 456
					}
				},
				{
					itemType: "resource-metadata",
					operation: "delete",
					parentId: "resource1",
					properties: {
						created: FIRST_TICK,
						id: "res-description",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				},
				{
					itemType: "edge",
					operation: "add",
					properties: {
						created: SECOND_TICK,
						id: "edge2",
						relationship: "eneind"
					}
				},
				{
					itemType: "vertex-metadata",
					operation: "delete",
					parentId: "0101010101010101010101010101010101010101010101010101010101010101",
					properties: {
						created: FIRST_TICK,
						id: "description",
						type: "https://schema.org/Text",
						value: "This is a test"
					}
				},
				{
					itemType: "edge-metadata",
					operation: "add",
					parentId: "edge2",
					properties: {
						created: SECOND_TICK,
						id: "edge-counter-2",
						type: "https://schema.org/Integer",
						value: 456
					}
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});
	});

	test("Can remove the immutable storage for a vertex", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			[{ id: "foo123" }, { id: "bar456" }],
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore.length).toEqual(1);

		await service.removeImmutable(id, TEST_NODE_IDENTITY);

		const vertex = await service.get(id, { includeChangesets: true, verifySignatureDepth: "all" });

		expect(vertex).toEqual({
			verified: true,
			verification: {
				[FIRST_TICK]: {
					changes: [
						{
							itemType: "alias",
							operation: "add",
							properties: { id: "foo123", created: FIRST_TICK }
						},
						{
							itemType: "alias",
							operation: "add",
							properties: { id: "bar456", created: FIRST_TICK }
						}
					]
				}
			},
			vertex: {
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				created: FIRST_TICK,
				nodeIdentity: TEST_NODE_IDENTITY,
				aliases: [
					{ id: "foo123", created: FIRST_TICK },
					{ id: "bar456", created: FIRST_TICK }
				],
				changesets: [
					{
						created: FIRST_TICK,
						userIdentity: TEST_USER_IDENTITY,
						hash: "GTZhAbOqfVvVGylIndMexE+7bcgidGB3j7JBY4Q0EC4="
					}
				]
			}
		});

		expect(immutableStore.length).toEqual(0);
	});

	test("Can query for a vertex by id", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		await service.create(
			undefined,
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create(
			undefined,
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const results = await service.query("0");
		expect(results.entities).toEqual([
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				created: 1724327816272
			},
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				created: 1724327716271
			}
		]);
	});

	test("Can query for a vertex by alias", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		await service.create(
			[{ id: "foo123" }, { id: "bar123" }],
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create(
			[{ id: "foo456" }, { id: "bar456" }],
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const results = await service.query("foo");
		expect(results.entities).toEqual([
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				created: 1724327816272,
				aliases: [
					{
						id: "foo456",
						created: 1724327816272
					},
					{
						id: "bar456",
						created: 1724327816272
					}
				]
			},
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				created: 1724327716271,
				aliases: [
					{
						id: "foo123",
						created: 1724327716271
					},
					{
						id: "bar123",
						created: 1724327716271
					}
				]
			}
		]);
	});

	test("Can query for a vertex by id or alias", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		await service.create(
			[{ id: "foo4" }],
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create(
			undefined,
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const results = await service.query("4");
		expect(results.entities).toEqual([
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				created: 1724327816272
			},
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				created: 1724327716271,
				aliases: [
					{
						id: "foo4",
						created: 1724327716271
					}
				]
			}
		]);
	});

	test("Can query for a vertex by mode id", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		await service.create(
			[{ id: "foo4" }],
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create(
			undefined,
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const results = await service.query("4", "id");
		expect(results.entities).toEqual([
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				created: 1724327816272
			}
		]);
	});

	test("Can query for a vertex by mode alias", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		await service.create(
			[{ id: "foo4" }],
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create(
			undefined,
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const results = await service.query("4", "alias");
		expect(results.entities).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				created: 1724327716271,
				aliases: [
					{
						id: "foo4",
						created: 1724327716271
					}
				]
			}
		]);
	});
});
