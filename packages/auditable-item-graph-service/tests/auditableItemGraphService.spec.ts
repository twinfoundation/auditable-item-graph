// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { VerifyDepth } from "@gtsc/auditable-item-graph-models";
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
import {
	decodeJwtToIntegrity,
	setupTestEnv,
	TEST_NODE_IDENTITY,
	TEST_USER_IDENTITY
} from "./setupTestEnv";
import { AuditableItemGraphService } from "../src/auditableItemGraphService";
import type { AuditableItemGraphChangeset } from "../src/entities/auditableItemGraphChangeset";
import type { AuditableItemGraphVertex } from "../src/entities/auditableItemGraphVertex";
import { initSchema } from "../src/schema";

let vertexStorage: MemoryEntityStorageConnector<AuditableItemGraphVertex>;
let changesetStorage: MemoryEntityStorageConnector<AuditableItemGraphChangeset>;
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

		changesetStorage = new MemoryEntityStorageConnector<AuditableItemGraphChangeset>({
			entitySchema: nameof<AuditableItemGraphChangeset>()
		});

		EntityStorageConnectorFactory.register("auditable-item-graph-vertex", () => vertexStorage);
		EntityStorageConnectorFactory.register(
			"auditable-item-graph-changeset",
			() => changesetStorage
		);

		immutableStorage = new MemoryEntityStorageConnector<ImmutableItem>({
			entitySchema: nameof<ImmutableItem>()
		});
		EntityStorageConnectorFactory.register("immutable-item", () => immutableStorage);

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
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY
		});

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [],
			hash: "5/QKaqyMYylY+/GwpcSHopUw9tSeIK3tYSNNoMuYwjw=",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changeset.immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		const { signature, integrity } = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(signature).toEqual(
			"khjWjRusY7cpGQb93waFkgUpzfsI1ynoCVc8JB/jqkxHnSKmPdheW9pDkGkslrVsbE5dGdpwD3wOfemSp8n8Dw=="
		);
		expect(integrity.userIdentity).toEqual(TEST_USER_IDENTITY);
		expect(integrity.patches).toEqual([]);
	});

	test("Can create a vertex with an alias", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			undefined,
			[{ id: "foo123" }, { id: "bar456" }],
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
			updated: FIRST_TICK,
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
			]
		});

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				}
			],
			hash: "Ht6zFJi0yl+MYTKgk+HdZW1PLWjJmSOwOkqrAA1NfVU=",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changeset.immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		const { signature, integrity } = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(signature).toEqual(
			"Upe1JYPqtP0FQ56xYwB5WFlR3CsyQKke55KTRmn0/waQm6/OWCz+HJlfDYR4EuMthR8NHAixrl2iweYLHZ1xAg=="
		);

		expect(integrity).toEqual({
			created: FIRST_TICK,
			patches: [
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});
	});

	test("Can create a vertex with some metadata", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			{
				description: "This is a test",
				counter: 123
			},
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
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: {
				description: "This is a test",
				counter: 123
			}
		});

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						description: "This is a test",
						counter: 123
					}
				}
			],
			hash: "XO3aD55mKvby+c8Wa4epNoBs29ohiAjZyFiR1L1LLtU=",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changeset.immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		const { signature, integrity } = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(signature).toEqual(
			"l52JqGY3zFON2k8jMg8syMa0JNWeayabD2E2g807a20OJtw1m39TVrZP0Yvu+DbIzun4h8fxD81HD872SqlrDw=="
		);

		expect(integrity).toEqual({
			created: FIRST_TICK,
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						description: "This is a test",
						counter: 123
					}
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});
	});

	test("Can get a vertex", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			{
				description: "This is a test",
				counter: 123
			},
			[{ id: "foo123" }, { id: "bar456" }],
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
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: {
				description: "This is a test",
				counter: 123
			},
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
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			{
				description: "This is a test",
				counter: 123
			},
			[{ id: "foo123" }, { id: "bar456" }],
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
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: {
				description: "This is a test",
				counter: 123
			},
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

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						description: "This is a test",
						counter: 123
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				}
			],
			hash: "9w/vi3/OZPZ+kuWB4PHNlDE1YxI9Ev3BpSX6+Tttk6U=",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});
	});

	test("Can get a vertex include changesets and verify current signature", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			{
				description: "This is a test",
				counter: 123
			},
			[{ id: "foo123" }, { id: "bar456" }],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.Current
		});

		expect(result.verified).toEqual(true);
		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: {
				description: "This is a test",
				counter: 123
			},
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

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						description: "This is a test",
						counter: 123
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				}
			],
			hash: "9w/vi3/OZPZ+kuWB4PHNlDE1YxI9Ev3BpSX6+Tttk6U=",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});
	});

	test("Can create and update with no changes and verify", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			{
				description: "This is a test",
				counter: 123
			},
			[{ id: "foo123" }, { id: "bar456" }],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			id,
			{
				description: "This is a test",
				counter: 123
			},
			[{ id: "foo123" }, { id: "bar456" }],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.Current
		});

		expect(result.verified).toEqual(true);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: FIRST_TICK,
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			metadata: {
				description: "This is a test",
				counter: 123
			},
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

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						description: "This is a test",
						counter: 123
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				}
			],
			hash: "9w/vi3/OZPZ+kuWB4PHNlDE1YxI9Ev3BpSX6+Tttk6U=",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});
	});

	test("Can create and update and verify aliases", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			{
				description: "This is a test",
				counter: 123
			},
			[{ id: "foo123" }, { id: "bar456" }],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			id,
			{
				description: "This is a test",
				counter: 123
			},
			[{ id: "foo321" }, { id: "bar456" }],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result.verified).toEqual(true);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: SECOND_TICK,
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			metadata: {
				description: "This is a test",
				counter: 123
			},
			aliases: [
				{
					id: "bar456",
					created: FIRST_TICK
				},
				{
					id: "foo321",
					created: SECOND_TICK
				}
			]
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						description: "This is a test",
						counter: 123
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				}
			],
			hash: "9w/vi3/OZPZ+kuWB4PHNlDE1YxI9Ev3BpSX6+Tttk6U=",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		expect(changesetStore[1]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: SECOND_TICK,
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			patches: [
				{
					op: "add",
					path: "/aliases/0/deleted",
					value: SECOND_TICK
				},
				{
					op: "add",
					path: "/aliases/-",
					value: {
						id: "foo321",
						created: SECOND_TICK
					}
				}
			],
			hash: "b4dMpT7Cy3KKpTRz9KmPq06isXbrmE7UWGHhLgPSdng=",
			immutableStorageId:
				"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changesetStore[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		let credentialSignature = await decodeJwtToIntegrity(immutableStore[0].data);
		expect(credentialSignature.signature).toEqual(
			"/ROnxm0c84ujgzT2gQlhiXh2PqBueNx59i7hixlyeB/17CuF4wFcGgCCQE9gcqymzIKBX7r1YHMlNvoPavruAQ=="
		);

		expect(credentialSignature.integrity).toEqual({
			created: FIRST_TICK,
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						description: "This is a test",
						counter: 123
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});

		credentialSignature = await decodeJwtToIntegrity(immutableStore[1].data);
		expect(credentialSignature.signature).toEqual(
			"olKZmmv95/BHrB7TGZnX4Nlc9XwmV3pAzjd6EajTHL4oCTU31PNcG2LmIqzBhaE7PHLVUYD34CrXFVdcMQP1AQ=="
		);

		expect(credentialSignature.integrity).toEqual({
			created: SECOND_TICK,
			patches: [
				{
					op: "add",
					path: "/aliases/0/deleted",
					value: SECOND_TICK
				},
				{
					op: "add",
					path: "/aliases/-",
					value: {
						id: "foo321",
						created: SECOND_TICK
					}
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});
	});

	test("Can create and update and verify aliases and metadata", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			{
				description: "This is a test",
				counter: 123
			},
			[{ id: "foo123" }, { id: "bar456" }],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			id,

			{
				title: "Title",
				counter: 456
			},
			[{ id: "foo123" }, { id: "bar456" }],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result.verified).toEqual(true);
		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: SECOND_TICK,
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			metadata: {
				title: "Title",
				counter: 456
			},
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

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						description: "This is a test",
						counter: 123
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				}
			],
			hash: "9w/vi3/OZPZ+kuWB4PHNlDE1YxI9Ev3BpSX6+Tttk6U=",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		expect(changesetStore[1]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: SECOND_TICK,
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			patches: [
				{
					op: "remove",
					path: "/metadata/description"
				},
				{
					op: "add",
					path: "/metadata/title",
					value: "Title"
				},
				{
					op: "replace",
					path: "/metadata/counter",
					value: 456
				}
			],
			hash: "I+v6vhvoUMMvX+mfg3BhUa6vQ2qogMWuAOqGw1/NXH0=",
			immutableStorageId:
				"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
		});

		const immutableStore = immutableStorage.getStore();
		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changesetStore[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		let credentialSignature = await decodeJwtToIntegrity(immutableStore[0].data);
		expect(credentialSignature.signature).toEqual(
			"/ROnxm0c84ujgzT2gQlhiXh2PqBueNx59i7hixlyeB/17CuF4wFcGgCCQE9gcqymzIKBX7r1YHMlNvoPavruAQ=="
		);

		expect(credentialSignature.integrity).toEqual({
			created: FIRST_TICK,
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						description: "This is a test",
						counter: 123
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});

		credentialSignature = await decodeJwtToIntegrity(immutableStore[1].data);
		expect(credentialSignature.signature).toEqual(
			"W9jtC6G56swSEpNhZN9I5tthrD9yce786KKhD6Xz13mATco3WC0kjWYsw/Khg2fmIx07CAadauj0B/UnrZ4RAw=="
		);

		expect(credentialSignature.integrity).toEqual({
			created: SECOND_TICK,
			patches: [
				{
					op: "remove",
					path: "/metadata/description"
				},
				{
					op: "add",
					path: "/metadata/title",
					value: "Title"
				},
				{
					op: "replace",
					path: "/metadata/counter",
					value: 456
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});
	});

	test("Can create and update and verify aliases, metadata and resources", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			{
				description: "This is a test",
				counter: 123
			},
			[{ id: "foo123" }, { id: "bar456" }],
			[
				{
					id: "resource1",
					metadata: {
						resDescription: "This is a test",
						resCounter: 123
					}
				},
				{
					id: "resource2",
					metadata: {
						resDescription: "This is a test2",
						resCounter: 456
					}
				}
			],
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			id,

			{
				title: "Title",
				counter: 456
			},
			[{ id: "foo123" }, { id: "bar456" }],
			[
				{
					id: "resource1",
					metadata: {
						resTitle: "Title",
						resCounter: 456
					}
				},
				{
					id: "resource2",
					metadata: {
						resTitle: "Title",
						resCounter: 456
					}
				}
			],
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result.verified).toEqual(true);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: SECOND_TICK,
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			metadata: {
				title: "Title",
				counter: 456
			},
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
			resources: [
				{
					id: "resource1",
					created: FIRST_TICK,
					metadata: {
						resTitle: "Title",
						resCounter: 456
					}
				},
				{
					id: "resource2",
					created: FIRST_TICK,
					metadata: {
						resTitle: "Title",
						resCounter: 456
					}
				}
			]
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						description: "This is a test",
						counter: 123
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				},
				{
					op: "add",
					path: "/resources",
					value: [
						{
							id: "resource1",
							created: FIRST_TICK,
							metadata: {
								resDescription: "This is a test",
								resCounter: 123
							}
						},
						{
							id: "resource2",
							created: FIRST_TICK,
							metadata: {
								resDescription: "This is a test2",
								resCounter: 456
							}
						}
					]
				}
			],
			hash: "bB8pbe9pCulcv+mYWl8OV963IUrlCclpheAtwBh1vkA=",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		expect(changesetStore[1]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: SECOND_TICK,
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			patches: [
				{
					op: "remove",
					path: "/metadata/description"
				},
				{
					op: "add",
					path: "/metadata/title",
					value: "Title"
				},
				{
					op: "replace",
					path: "/metadata/counter",
					value: 456
				},
				{
					op: "add",
					path: "/resources/0/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/resources/0/metadata/resDescription"
				},
				{
					op: "add",
					path: "/resources/0/metadata/resTitle",
					value: "Title"
				},
				{
					op: "replace",
					path: "/resources/0/metadata/resCounter",
					value: 456
				},
				{
					op: "add",
					path: "/resources/1/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/resources/1/metadata/resDescription"
				},
				{
					op: "add",
					path: "/resources/1/metadata/resTitle",
					value: "Title"
				}
			],
			hash: "B2/OVFCLFXukixMkxt7au9vtk1nG+aEg6xIAyewQ3Ws=",
			immutableStorageId:
				"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
		});

		const immutableStore = immutableStorage.getStore();
		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changesetStore[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		let credentialSignature = await decodeJwtToIntegrity(immutableStore[0].data);
		expect(credentialSignature.signature).toEqual(
			"ca+naU/ylRTAHcWykr54XLklKfDzWTCOiaMi/2pJ3k2mZzTO7q1JAEuoU+kT3bC6ufIjf3bKTO8rOdLoKYlDAQ=="
		);

		expect(credentialSignature.integrity).toEqual({
			created: FIRST_TICK,
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						description: "This is a test",
						counter: 123
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				},
				{
					op: "add",
					path: "/resources",
					value: [
						{
							id: "resource1",
							created: FIRST_TICK,
							metadata: {
								resDescription: "This is a test",
								resCounter: 123
							}
						},
						{
							id: "resource2",
							created: FIRST_TICK,
							metadata: {
								resDescription: "This is a test2",
								resCounter: 456
							}
						}
					]
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});

		credentialSignature = await decodeJwtToIntegrity(immutableStore[1].data);
		expect(credentialSignature.signature).toEqual(
			"FKpPLGVHYD4mpBr1XV1J7mHVL82wv4AHu+Qb1sj3Kb1kdYFIpw83bXbQIjTbfEiFrXKRezEP/eQYwDKGb/HHAA=="
		);

		expect(credentialSignature.integrity).toEqual({
			created: SECOND_TICK,
			patches: [
				{
					op: "remove",
					path: "/metadata/description"
				},
				{
					op: "add",
					path: "/metadata/title",
					value: "Title"
				},
				{
					op: "replace",
					path: "/metadata/counter",
					value: 456
				},
				{
					op: "add",
					path: "/resources/0/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/resources/0/metadata/resDescription"
				},
				{
					op: "add",
					path: "/resources/0/metadata/resTitle",
					value: "Title"
				},
				{
					op: "replace",
					path: "/resources/0/metadata/resCounter",
					value: 456
				},
				{
					op: "add",
					path: "/resources/1/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/resources/1/metadata/resDescription"
				},
				{
					op: "add",
					path: "/resources/1/metadata/resTitle",
					value: "Title"
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});
	});

	test("Can create and update and verify edges", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			undefined,
			undefined,
			undefined,
			[
				{
					id: "edge1",
					relationship: "friend",
					metadata: {
						description: "This is a test",
						counter: 123
					}
				}
			],
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			id,
			undefined,
			undefined,
			undefined,
			[
				{
					id: "edge1",
					relationship: "frenemy",
					metadata: {
						title: "Title",
						counter: 456
					}
				}
			],
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result.verified).toEqual(true);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: SECOND_TICK,
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			edges: [
				{
					id: "edge1",
					created: FIRST_TICK,
					relationship: "frenemy",
					metadata: {
						title: "Title",
						counter: 456
					}
				}
			]
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			patches: [
				{
					op: "add",
					path: "/edges",
					value: [
						{
							id: "edge1",
							created: FIRST_TICK,
							metadata: {
								description: "This is a test",
								counter: 123
							},
							relationship: "friend"
						}
					]
				}
			],
			hash: "F+qfuzpBTDE8mhDPzev1bzdSbHTn6qrOtJL7jWINeNM=",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		expect(changesetStore[1]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: SECOND_TICK,
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			patches: [
				{
					op: "add",
					path: "/edges/0/updated",
					value: SECOND_TICK
				},
				{
					op: "replace",
					path: "/edges/0/relationship",
					value: "frenemy"
				},
				{
					op: "remove",
					path: "/edges/0/metadata/description"
				},
				{
					op: "add",
					path: "/edges/0/metadata/title",
					value: "Title"
				},
				{
					op: "replace",
					path: "/edges/0/metadata/counter",
					value: 456
				}
			],
			hash: "BP1rU6d9qoKbfEZBE7OIAOEnQzIzV1Ni4p8s9sqUM1o=",
			immutableStorageId:
				"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
		});
	});

	test("Can create and update and verify aliases, metadata, resources and edges", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			{
				description: "This is a test",
				counter: 123
			},
			[
				{
					id: "foo123",
					metadata: {
						aliasDescription: "This is a test",
						aliasCounter: 123
					}
				},
				{
					id: "bar456",
					metadata: {
						aliasDescription: "This is a test",
						aliasCounter: 123
					}
				}
			],
			[
				{
					id: "resource1",
					metadata: {
						resDescription: "This is a test",
						resCounter: 123
					}
				},
				{
					id: "resource2",
					metadata: {
						resDescription: "This is a test2",
						resCounter: 456
					}
				}
			],
			[
				{
					id: "edge1",
					relationship: "friend",
					metadata: {
						edgeDescription: "This is a test",
						edgeCounter: 123
					}
				},
				{
					id: "edge2",
					relationship: "enemy",
					metadata: {
						edgeDescription: "This is a test2",
						edgeCounter: 456
					}
				}
			],
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			id,

			{
				title: "Title",
				counter: 123
			},
			[
				{
					id: "foo123",
					metadata: {
						aliasTitle: "Title",
						aliasCounter: 123
					}
				},
				{
					id: "bar456",
					metadata: {
						aliasTitle: "Title",
						aliasCounter: 123
					}
				}
			],
			[
				{
					id: "resource1",
					metadata: {
						resTitle: "Title",
						resCounter: 123
					}
				},
				{
					id: "resource2",
					metadata: {
						resTitle: "Title",
						resCounter: 456
					}
				}
			],
			[
				{
					id: "edge1",
					relationship: "friend",
					metadata: {
						edgeTitle: "Title",
						edgeCounter: 123
					}
				},
				{
					id: "edge2",
					relationship: "enemy",
					metadata: {
						edgeTitle: "Title",
						edgeCounter: 456
					}
				}
			],
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result.verified).toEqual(true);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: SECOND_TICK,
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			metadata: {
				title: "Title",
				counter: 123
			},
			aliases: [
				{
					id: "foo123",
					created: FIRST_TICK,
					metadata: {
						aliasTitle: "Title",
						aliasCounter: 123
					}
				},
				{
					id: "bar456",
					created: FIRST_TICK,
					metadata: {
						aliasTitle: "Title",
						aliasCounter: 123
					}
				}
			],
			resources: [
				{
					id: "resource1",
					created: FIRST_TICK,
					metadata: {
						resTitle: "Title",
						resCounter: 123
					}
				},
				{
					id: "resource2",
					created: FIRST_TICK,
					metadata: {
						resTitle: "Title",
						resCounter: 456
					}
				}
			],
			edges: [
				{
					id: "edge1",
					created: FIRST_TICK,
					relationship: "friend",
					metadata: {
						edgeTitle: "Title",
						edgeCounter: 123
					}
				},
				{
					id: "edge2",
					created: FIRST_TICK,
					relationship: "enemy",
					metadata: {
						edgeTitle: "Title",
						edgeCounter: 456
					}
				}
			]
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						description: "This is a test",
						counter: 123
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							created: FIRST_TICK,
							metadata: {
								aliasDescription: "This is a test",
								aliasCounter: 123
							}
						},
						{
							id: "bar456",
							created: FIRST_TICK,
							metadata: {
								aliasDescription: "This is a test",
								aliasCounter: 123
							}
						}
					]
				},
				{
					op: "add",
					path: "/resources",
					value: [
						{
							id: "resource1",
							created: FIRST_TICK,
							metadata: {
								resDescription: "This is a test",
								resCounter: 123
							}
						},
						{
							id: "resource2",
							created: FIRST_TICK,
							metadata: {
								resDescription: "This is a test2",
								resCounter: 456
							}
						}
					]
				},
				{
					op: "add",
					path: "/edges",
					value: [
						{
							id: "edge1",
							created: FIRST_TICK,
							metadata: {
								edgeDescription: "This is a test",
								edgeCounter: 123
							},
							relationship: "friend"
						},
						{
							id: "edge2",
							created: FIRST_TICK,
							metadata: {
								edgeDescription: "This is a test2",
								edgeCounter: 456
							},
							relationship: "enemy"
						}
					]
				}
			],
			hash: "8fZufYAsB92ULJZyrNXQzJQTQDZUlRDivUKjx3Vlges=",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		expect(changesetStore[1]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: SECOND_TICK,
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			patches: [
				{
					op: "remove",
					path: "/metadata/description"
				},
				{
					op: "add",
					path: "/metadata/title",
					value: "Title"
				},
				{
					op: "add",
					path: "/aliases/0/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/aliases/0/metadata/aliasDescription"
				},
				{
					op: "add",
					path: "/aliases/0/metadata/aliasTitle",
					value: "Title"
				},
				{
					op: "add",
					path: "/aliases/1/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/aliases/1/metadata/aliasDescription"
				},
				{
					op: "add",
					path: "/aliases/1/metadata/aliasTitle",
					value: "Title"
				},
				{
					op: "add",
					path: "/resources/0/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/resources/0/metadata/resDescription"
				},
				{
					op: "add",
					path: "/resources/0/metadata/resTitle",
					value: "Title"
				},
				{
					op: "add",
					path: "/resources/1/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/resources/1/metadata/resDescription"
				},
				{
					op: "add",
					path: "/resources/1/metadata/resTitle",
					value: "Title"
				},
				{
					op: "add",
					path: "/edges/0/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/edges/0/metadata/edgeDescription"
				},
				{
					op: "add",
					path: "/edges/0/metadata/edgeTitle",
					value: "Title"
				},
				{
					op: "add",
					path: "/edges/1/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/edges/1/metadata/edgeDescription"
				},
				{
					op: "add",
					path: "/edges/1/metadata/edgeTitle",
					value: "Title"
				}
			],
			hash: "96ihiKSmWpkjXfpJGcr619EjBg7Tdi/PQOjjdM2Wv2M=",
			immutableStorageId:
				"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changesetStore[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		let credentialSignature = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(credentialSignature.signature).toEqual(
			"uENNDXxEvMpxu45dIsfSWlESqfeyUQS5cNHnUBTFXv5QMGpYsPmaRxkiZmeT8nhB4MDk7x235DfXS/p5ytndCA=="
		);

		expect(credentialSignature.integrity).toEqual({
			created: FIRST_TICK,
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						description: "This is a test",
						counter: 123
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							created: FIRST_TICK,
							metadata: {
								aliasDescription: "This is a test",
								aliasCounter: 123
							}
						},
						{
							id: "bar456",
							created: FIRST_TICK,
							metadata: {
								aliasDescription: "This is a test",
								aliasCounter: 123
							}
						}
					]
				},
				{
					op: "add",
					path: "/resources",
					value: [
						{
							id: "resource1",
							created: FIRST_TICK,
							metadata: {
								resDescription: "This is a test",
								resCounter: 123
							}
						},
						{
							id: "resource2",
							created: FIRST_TICK,
							metadata: {
								resDescription: "This is a test2",
								resCounter: 456
							}
						}
					]
				},
				{
					op: "add",
					path: "/edges",
					value: [
						{
							id: "edge1",
							created: FIRST_TICK,
							metadata: {
								edgeDescription: "This is a test",
								edgeCounter: 123
							},
							relationship: "friend"
						},
						{
							id: "edge2",
							created: FIRST_TICK,
							metadata: {
								edgeDescription: "This is a test2",
								edgeCounter: 456
							},
							relationship: "enemy"
						}
					]
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});

		credentialSignature = await decodeJwtToIntegrity(immutableStore[1].data);

		expect(credentialSignature.signature).toEqual(
			"WVzwOhr8Xm6MigCgz4eNxYFKuVVkPjOdiJUq9PuteGGVr6femFeYge2tp5NaGQYMmGfSi1R14tP2Z4uFe+VcCA=="
		);

		expect(credentialSignature.integrity).toEqual({
			created: SECOND_TICK,
			patches: [
				{
					op: "remove",
					path: "/metadata/description"
				},
				{
					op: "add",
					path: "/metadata/title",
					value: "Title"
				},
				{
					op: "add",
					path: "/aliases/0/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/aliases/0/metadata/aliasDescription"
				},
				{
					op: "add",
					path: "/aliases/0/metadata/aliasTitle",
					value: "Title"
				},
				{
					op: "add",
					path: "/aliases/1/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/aliases/1/metadata/aliasDescription"
				},
				{
					op: "add",
					path: "/aliases/1/metadata/aliasTitle",
					value: "Title"
				},
				{
					op: "add",
					path: "/resources/0/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/resources/0/metadata/resDescription"
				},
				{
					op: "add",
					path: "/resources/0/metadata/resTitle",
					value: "Title"
				},
				{
					op: "add",
					path: "/resources/1/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/resources/1/metadata/resDescription"
				},
				{
					op: "add",
					path: "/resources/1/metadata/resTitle",
					value: "Title"
				},
				{
					op: "add",
					path: "/edges/0/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/edges/0/metadata/edgeDescription"
				},
				{
					op: "add",
					path: "/edges/0/metadata/edgeTitle",
					value: "Title"
				},
				{
					op: "add",
					path: "/edges/1/updated",
					value: SECOND_TICK
				},
				{
					op: "remove",
					path: "/edges/1/metadata/edgeDescription"
				},
				{
					op: "add",
					path: "/edges/1/metadata/edgeTitle",
					value: "Title"
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});
	});

	test("Can remove the immutable storage for a vertex", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			undefined,
			[{ id: "foo123" }, { id: "bar456" }],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore.length).toEqual(1);

		await service.removeImmutable(id, TEST_NODE_IDENTITY);

		const vertex = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(vertex).toEqual({
			verified: true,
			verification: [
				{
					created: FIRST_TICK
				}
			],
			vertex: {
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				created: FIRST_TICK,
				updated: FIRST_TICK,
				nodeIdentity:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
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
			},
			changesets: [
				{
					vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
					created: FIRST_TICK,
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
					patches: [
						{
							op: "add",
							path: "/aliases",
							value: [
								{
									id: "foo123",
									created: FIRST_TICK
								},
								{
									id: "bar456",
									created: FIRST_TICK
								}
							]
						}
					],
					hash: "Ht6zFJi0yl+MYTKgk+HdZW1PLWjJmSOwOkqrAA1NfVU="
				}
			]
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

		const results = await service.query({ id: "0" });
		expect(results.entities).toEqual([
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				created: SECOND_TICK
			},
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				created: FIRST_TICK
			}
		]);
	});

	test("Can query for a vertex by alias", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		await service.create(
			undefined,
			[{ id: "foo123" }, { id: "bar123" }],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create(
			undefined,
			[{ id: "foo456" }, { id: "bar456" }],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const results = await service.query({ id: "foo" });
		expect(results.entities).toEqual([
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				created: SECOND_TICK,
				aliases: [
					{
						id: "foo456",
						created: SECOND_TICK
					},
					{
						id: "bar456",
						created: SECOND_TICK
					}
				]
			},
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				created: FIRST_TICK,
				aliases: [
					{
						id: "foo123",
						created: FIRST_TICK
					},
					{
						id: "bar123",
						created: FIRST_TICK
					}
				]
			}
		]);
	});

	test("Can query for a vertex by id or alias", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		await service.create(
			undefined,
			[{ id: "foo4" }],
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

		const results = await service.query({ id: "4" });
		expect(results.entities).toEqual([
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				created: SECOND_TICK
			},
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				created: FIRST_TICK,
				aliases: [
					{
						id: "foo4",
						created: FIRST_TICK
					}
				]
			}
		]);
	});

	test("Can query for a vertex by mode id", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		await service.create(
			undefined,
			[{ id: "foo4" }],
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

		const results = await service.query({ id: "4", idMode: "id" });
		expect(results.entities).toEqual([
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				created: SECOND_TICK
			}
		]);
	});

	test("Can query for a vertex by mode alias", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		await service.create(
			undefined,
			[{ id: "foo4" }],
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

		const results = await service.query({ id: "4", idMode: "alias" });
		expect(results.entities).toEqual([
			{
				id: "0101010101010101010101010101010101010101010101010101010101010101",
				created: FIRST_TICK,
				aliases: [
					{
						id: "foo4",
						created: FIRST_TICK
					}
				]
			}
		]);
	});

	test("Can create a vertex with some metadata and a valid schema", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });

		const id = await service.create(
			{
				description: "This is a test",
				counter: 123
			},
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
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: {
				description: "This is a test",
				counter: 123
			}
		});

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						description: "This is a test",
						counter: 123
					}
				}
			],
			hash: "XO3aD55mKvby+c8Wa4epNoBs29ohiAjZyFiR1L1LLtU=",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changeset.immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		const { signature, integrity } = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(signature).toEqual(
			"l52JqGY3zFON2k8jMg8syMa0JNWeayabD2E2g807a20OJtw1m39TVrZP0Yvu+DbIzun4h8fxD81HD872SqlrDw=="
		);

		expect(integrity).toEqual({
			created: FIRST_TICK,
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						description: "This is a test",
						counter: 123
					}
				}
			],
			userIdentity: TEST_USER_IDENTITY
		});
	});
});
