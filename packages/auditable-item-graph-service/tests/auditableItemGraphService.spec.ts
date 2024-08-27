// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphImmutable } from "@gtsc/auditable-item-graph-models";
import { Converter, ObjectHelper, RandomHelper } from "@gtsc/core";
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
import { VaultEncryptionType } from "@gtsc/vault-models";
import {
	setupTestEnv,
	TEST_IDENTITY_ID,
	TEST_NODE_ID,
	TEST_VAULT_CONNECTOR,
	TEST_VAULT_KEY
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
			"audit-trail",
			() => new EntityStorageImmutableStorageConnector()
		);

		Date.now = vi
			.fn()
			.mockImplementationOnce(() => FIRST_TICK)
			.mockImplementation(() => SECOND_TICK);
		RandomHelper.generate = vi
			.fn()
			.mockImplementationOnce(length => new Uint8Array(length))
			.mockImplementationOnce(length => new Uint8Array(length).fill(1))
			.mockImplementationOnce(length => new Uint8Array(length).fill(2))
			.mockImplementationOnce(length => new Uint8Array(length).fill(3))
			.mockImplementationOnce(length => new Uint8Array(length).fill(4));
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
			TEST_IDENTITY_ID,
			TEST_NODE_ID
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex.id.length).toEqual(64);
		expect(vertex.created).toEqual(FIRST_TICK);
		expect(vertex.nodeIdentity).toEqual(TEST_NODE_ID);
		expect(vertex.changesets?.length).toEqual(1);
		expect(vertex.changesets?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.changesets?.[0].identity).toEqual(TEST_IDENTITY_ID);
		expect(vertex.changesets?.[0].hash).toEqual("nug4YkcPxjBloc1B60eX2GwglqJx1DtrhICuQM6ntWA=");

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			vertex.changesets?.[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_ID);

		const immutableData = await TEST_VAULT_CONNECTOR.decrypt(
			TEST_VAULT_KEY,
			VaultEncryptionType.ChaCha20Poly1305,
			Converter.base64ToBytes(immutableStore[0].data)
		);

		const immutableObject = ObjectHelper.fromBytes<IAuditableItemGraphImmutable>(immutableData);

		expect(immutableObject.signature).toEqual(
			"Z6bTu2bTgCdG7kDU233ydVAw0bCAOrOjFdj9rkMgMBEdTroxMDdOACCfEapfE8MbGLEQeOxQQWapO5PddFsfBw=="
		);
		expect(immutableObject.canonical).toEqual("[]");
	});

	test("Can create a vertex with an alias", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			[{ id: "foo123" }, { id: "bar456" }],
			undefined,
			undefined,
			undefined,
			TEST_IDENTITY_ID,
			TEST_NODE_ID
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex.id.length).toEqual(64);
		expect(vertex.created).toEqual(FIRST_TICK);
		expect(vertex.nodeIdentity).toEqual(TEST_NODE_ID);
		expect(vertex.aliases?.length).toEqual(2);
		expect(vertex.aliases?.[0].id).toEqual("foo123");
		expect(vertex.aliases?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.aliases?.[0].deleted).toBeUndefined();
		expect(vertex.aliases?.[1].id).toEqual("bar456");
		expect(vertex.aliases?.[1].created).toEqual(FIRST_TICK);
		expect(vertex.aliases?.[1].deleted).toBeUndefined();
		expect(vertex.changesets?.length).toEqual(1);
		expect(vertex.changesets?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.changesets?.[0].identity).toEqual(TEST_IDENTITY_ID);
		expect(vertex.changesets?.[0].hash).toEqual("C9rz+oVG2S70QTvbY6W/Kw4R5a+0NV5FYdsdz9cWc8s=");

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			vertex.changesets?.[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_ID);

		const immutableData = await TEST_VAULT_CONNECTOR.decrypt(
			TEST_VAULT_KEY,
			VaultEncryptionType.ChaCha20Poly1305,
			Converter.base64ToBytes(immutableStore[0].data)
		);

		const immutableObject = ObjectHelper.fromBytes<IAuditableItemGraphImmutable>(immutableData);

		expect(immutableObject.signature).toEqual(
			"n9bW98NB4BteDkev//RMspN9SwrruZtNMTQ/7xAc95pV5wTlmYlkfzlpfp8ZLP2X25+aWtI5THywpychxJ9GBg=="
		);
		const changes = JSON.parse(immutableObject.canonical ?? "");
		expect(changes?.length).toEqual(2);
		expect(changes?.[0].itemType).toEqual("alias");
		expect(changes?.[0].operation).toEqual("add");
		expect(changes?.[0].changed.id).toEqual("foo123");
		expect(changes?.[0].changed.created).toEqual(FIRST_TICK);
		expect(changes?.[1].itemType).toEqual("alias");
		expect(changes?.[1].operation).toEqual("add");
		expect(changes?.[1].changed.id).toEqual("bar456");
		expect(changes?.[1].changed.created).toEqual(FIRST_TICK);
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
			TEST_IDENTITY_ID,
			TEST_NODE_ID
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex.id.length).toEqual(64);
		expect(vertex.created).toEqual(FIRST_TICK);
		expect(vertex.nodeIdentity).toEqual(TEST_NODE_ID);
		expect(vertex.metadata?.[0].id).toEqual("description");
		expect(vertex.metadata?.[0].value).toEqual("This is a test");
		expect(vertex.metadata?.[0].type).toEqual("https://schema.org/Text");
		expect(vertex.metadata?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.metadata?.[1].id).toEqual("counter");
		expect(vertex.metadata?.[1].value).toEqual(123);
		expect(vertex.metadata?.[1].type).toEqual("https://schema.org/Integer");
		expect(vertex.metadata?.[1].created).toEqual(FIRST_TICK);

		expect(vertex.changesets?.length).toEqual(1);
		expect(vertex.changesets?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.changesets?.[0].identity).toEqual(TEST_IDENTITY_ID);
		expect(vertex.changesets?.[0].hash).toEqual("IAvyqSrswFzXaf7VaW+eBDfelgLqgoWb/aKqUegUFMs=");

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			vertex.changesets?.[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_ID);

		const immutableData = await TEST_VAULT_CONNECTOR.decrypt(
			TEST_VAULT_KEY,
			VaultEncryptionType.ChaCha20Poly1305,
			Converter.base64ToBytes(immutableStore[0].data)
		);

		const immutableObject = ObjectHelper.fromBytes<IAuditableItemGraphImmutable>(immutableData);

		expect(immutableObject.signature).toEqual(
			"+zUEY0/pgAjeK0iB57n65uThGzhobZpHyrVCU6jnJfZWg6DULLu5sESajVQtJ218Swr9AX/Ylrzx4Bcp+gJ1Bg=="
		);
		const changes = JSON.parse(immutableObject.canonical ?? "");
		expect(changes?.length).toEqual(2);
		expect(changes?.[0].itemType).toEqual("vertex-metadata");
		expect(changes?.[0].parentId).toEqual(
			"0000000000000000000000000000000000000000000000000000000000000000"
		);
		expect(changes?.[0].operation).toEqual("add");
		expect(changes?.[0].changed.id).toEqual("description");
		expect(changes?.[0].changed.created).toEqual(FIRST_TICK);
		expect(changes?.[0].changed.type).toEqual("https://schema.org/Text");
		expect(changes?.[0].changed.value).toEqual("This is a test");
		expect(changes?.[1].itemType).toEqual("vertex-metadata");
		expect(changes?.[1].parentId).toEqual(
			"0000000000000000000000000000000000000000000000000000000000000000"
		);
		expect(changes?.[1].operation).toEqual("add");
		expect(changes?.[1].changed.id).toEqual("counter");
		expect(changes?.[1].changed.created).toEqual(FIRST_TICK);
		expect(changes?.[1].changed.type).toEqual("https://schema.org/Integer");
		expect(changes?.[1].changed.value).toEqual(123);
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
			TEST_IDENTITY_ID,
			TEST_NODE_ID
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const result = await service.get(id);
		const vertex = result.vertex;

		expect(vertex.id.length).toEqual(64);
		expect(vertex.created).toEqual(FIRST_TICK);
		expect(vertex.nodeIdentity).toEqual(TEST_NODE_ID);
		expect(vertex.changesets).toBeUndefined();
		expect(vertex.metadata?.[0].id).toEqual("description");
		expect(vertex.metadata?.[0].value).toEqual("This is a test");
		expect(vertex.metadata?.[0].type).toEqual("https://schema.org/Text");
		expect(vertex.metadata?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.metadata?.[1].id).toEqual("counter");
		expect(vertex.metadata?.[1].value).toEqual(123);
		expect(vertex.metadata?.[1].type).toEqual("https://schema.org/Integer");
		expect(vertex.metadata?.[1].created).toEqual(FIRST_TICK);
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
			TEST_IDENTITY_ID,
			TEST_NODE_ID
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const result = await service.get(id, { includeChangesets: true });
		const vertex = result.vertex;

		expect(vertex.id.length).toEqual(64);
		expect(vertex.created).toEqual(FIRST_TICK);
		expect(vertex.nodeIdentity).toEqual(TEST_NODE_ID);
		expect(vertex.metadata?.[0].id).toEqual("description");
		expect(vertex.metadata?.[0].value).toEqual("This is a test");
		expect(vertex.metadata?.[0].type).toEqual("https://schema.org/Text");
		expect(vertex.metadata?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.metadata?.[1].id).toEqual("counter");
		expect(vertex.metadata?.[1].value).toEqual(123);
		expect(vertex.metadata?.[1].type).toEqual("https://schema.org/Integer");
		expect(vertex.metadata?.[1].created).toEqual(FIRST_TICK);
		expect(vertex.changesets?.length).toEqual(1);
		expect(vertex.changesets?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.changesets?.[0].identity).toEqual(TEST_IDENTITY_ID);
		expect(vertex.changesets?.[0].hash).toEqual("emYjVk33gnSqEjDRgZ0bum6QF3XsZKgBGHH0wrxLZQQ=");
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
			TEST_IDENTITY_ID,
			TEST_NODE_ID
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: "current"
		});

		expect(result.verified).toEqual(true);
		expect(result.verification?.[FIRST_TICK].changes.length).toEqual(4);

		const vertex = result.vertex;

		expect(vertex.id.length).toEqual(64);
		expect(vertex.created).toEqual(FIRST_TICK);
		expect(vertex.nodeIdentity).toEqual(TEST_NODE_ID);
		expect(vertex.metadata?.[0].id).toEqual("description");
		expect(vertex.metadata?.[0].value).toEqual("This is a test");
		expect(vertex.metadata?.[0].type).toEqual("https://schema.org/Text");
		expect(vertex.metadata?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.metadata?.[1].id).toEqual("counter");
		expect(vertex.metadata?.[1].value).toEqual(123);
		expect(vertex.metadata?.[1].type).toEqual("https://schema.org/Integer");
		expect(vertex.metadata?.[1].created).toEqual(FIRST_TICK);
		expect(vertex.changesets?.length).toEqual(1);
		expect(vertex.changesets?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.changesets?.[0].identity).toEqual(TEST_IDENTITY_ID);
		expect(vertex.changesets?.[0].hash).toEqual("emYjVk33gnSqEjDRgZ0bum6QF3XsZKgBGHH0wrxLZQQ=");
		expect(vertex.changesets?.[0].immutableStorageId).toEqual(
			"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
		);
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
			TEST_IDENTITY_ID,
			TEST_NODE_ID
		);

		await service.update(
			id,
			[{ id: "foo123" }, { id: "bar456" }],
			metadata,
			undefined,
			undefined,
			TEST_IDENTITY_ID,
			TEST_NODE_ID
		);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: "current"
		});

		expect(result.verified).toEqual(true);
		expect(result.verification?.[FIRST_TICK].changes.length).toEqual(4);

		const vertex = result.vertex;

		expect(vertex.id.length).toEqual(64);
		expect(vertex.created).toEqual(FIRST_TICK);
		expect(vertex.nodeIdentity).toEqual(TEST_NODE_ID);
		expect(vertex.metadata?.[0].id).toEqual("description");
		expect(vertex.metadata?.[0].value).toEqual("This is a test");
		expect(vertex.metadata?.[0].type).toEqual("https://schema.org/Text");
		expect(vertex.metadata?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.metadata?.[1].id).toEqual("counter");
		expect(vertex.metadata?.[1].value).toEqual(123);
		expect(vertex.metadata?.[1].type).toEqual("https://schema.org/Integer");
		expect(vertex.metadata?.[1].created).toEqual(FIRST_TICK);
		expect(vertex.changesets?.length).toEqual(1);
		expect(vertex.changesets?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.changesets?.[0].identity).toEqual(TEST_IDENTITY_ID);
		expect(vertex.changesets?.[0].hash).toEqual("emYjVk33gnSqEjDRgZ0bum6QF3XsZKgBGHH0wrxLZQQ=");
		expect(vertex.changesets?.[0].immutableStorageId).toEqual(
			"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
		);
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
			TEST_IDENTITY_ID,
			TEST_NODE_ID
		);

		await service.update(
			id,
			[{ id: "foo321" }, { id: "bar456" }],
			metadata,
			undefined,
			undefined,
			TEST_IDENTITY_ID,
			TEST_NODE_ID
		);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: "all"
		});

		expect(result.verified).toEqual(true);
		expect(result.verification?.[FIRST_TICK].changes.length).toEqual(4);

		const vertex = result.vertex;

		expect(vertex.id.length).toEqual(64);
		expect(vertex.created).toEqual(FIRST_TICK);
		expect(vertex.nodeIdentity).toEqual(TEST_NODE_ID);
		expect(vertex.metadata?.[0].id).toEqual("description");
		expect(vertex.metadata?.[0].value).toEqual("This is a test");
		expect(vertex.metadata?.[0].type).toEqual("https://schema.org/Text");
		expect(vertex.metadata?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.metadata?.[1].id).toEqual("counter");
		expect(vertex.metadata?.[1].value).toEqual(123);
		expect(vertex.metadata?.[1].type).toEqual("https://schema.org/Integer");
		expect(vertex.metadata?.[1].created).toEqual(FIRST_TICK);
		expect(vertex.changesets?.length).toEqual(2);
		expect(vertex.changesets?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.changesets?.[0].identity).toEqual(TEST_IDENTITY_ID);
		expect(vertex.changesets?.[0].hash).toEqual("emYjVk33gnSqEjDRgZ0bum6QF3XsZKgBGHH0wrxLZQQ=");
		expect(vertex.changesets?.[0].immutableStorageId).toEqual(
			"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
		);
		expect(vertex.changesets?.[1].created).toEqual(SECOND_TICK);
		expect(vertex.changesets?.[1].identity).toEqual(TEST_IDENTITY_ID);
		expect(vertex.changesets?.[1].hash).toEqual("k96WOARYuwb7vjrdG8q/jPAtrWAB/drYwLeivcE4GXU=");
		expect(vertex.changesets?.[1].immutableStorageId).toEqual(
			"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404"
		);
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
			TEST_IDENTITY_ID,
			TEST_NODE_ID
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
			TEST_IDENTITY_ID,
			TEST_NODE_ID
		);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: "all"
		});

		expect(result.verified).toEqual(true);
		expect(result.verification?.[FIRST_TICK].changes.length).toEqual(4);

		const vertex = result.vertex;

		expect(vertex.id.length).toEqual(64);
		expect(vertex.created).toEqual(FIRST_TICK);
		expect(vertex.nodeIdentity).toEqual(TEST_NODE_ID);
		expect(vertex.metadata?.[0].id).toEqual("counter");
		expect(vertex.metadata?.[0].value).toEqual(456);
		expect(vertex.metadata?.[0].type).toEqual("https://schema.org/Integer");
		expect(vertex.metadata?.[0].created).toEqual(SECOND_TICK);
		expect(vertex.metadata?.[1].id).toEqual("title");
		expect(vertex.metadata?.[1].value).toEqual("Title");
		expect(vertex.metadata?.[1].type).toEqual("https://schema.org/Text");
		expect(vertex.metadata?.[1].created).toEqual(SECOND_TICK);
		expect(vertex.changesets?.length).toEqual(2);
		expect(vertex.changesets?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.changesets?.[0].identity).toEqual(TEST_IDENTITY_ID);
		expect(vertex.changesets?.[0].hash).toEqual("emYjVk33gnSqEjDRgZ0bum6QF3XsZKgBGHH0wrxLZQQ=");
		expect(vertex.changesets?.[0].immutableStorageId).toEqual(
			"immutable:entity-storage:0202020202020202020202020202020202020202020202020202020202020202"
		);
		expect(vertex.changesets?.[1].created).toEqual(SECOND_TICK);
		expect(vertex.changesets?.[1].identity).toEqual(TEST_IDENTITY_ID);
		expect(vertex.changesets?.[1].hash).toEqual("5fUt3FsAMB+3W1HPsj7nUbo8eoWmvHtNTADKZWT9RWk=");
		expect(vertex.changesets?.[1].immutableStorageId).toEqual(
			"immutable:entity-storage:0404040404040404040404040404040404040404040404040404040404040404"
		);
	});
});
