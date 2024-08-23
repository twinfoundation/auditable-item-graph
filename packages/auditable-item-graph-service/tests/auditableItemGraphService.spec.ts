// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
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
import { setupTestEnv, TEST_IDENTITY_ID, TEST_NODE_ID } from "./setupTestEnv";
import { AuditableItemGraphService } from "../src/auditableItemGraphService";
import type { AuditableItemGraphVertex } from "../src/entities/auditableItemGraphVertex";
import { initSchema } from "../src/schema";

let vertexStorage: MemoryEntityStorageConnector<AuditableItemGraphVertex>;
let immutableStorage: MemoryEntityStorageConnector<ImmutableItem>;

const FIRST_TICK = 1724327716271;

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
	});

	test("Can create an instance", async () => {
		const service = new AuditableItemGraphService();
		expect(service).toBeDefined();
	});

	test("Can create a vertex with no properties", async () => {
		Date.now = vi.fn().mockImplementationOnce(() => FIRST_TICK);

		const service = new AuditableItemGraphService();
		const id = await service.create(undefined, undefined, TEST_IDENTITY_ID, TEST_NODE_ID);
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
		expect(immutableStore[0].data).toEqual(
			"Z6bTu2bTgCdG7kDU233ydVAw0bCAOrOjFdj9rkMgMBEdTroxMDdOACCfEapfE8MbGLEQeOxQQWapO5PddFsfBw=="
		);
	});

	test("Can create a vertex with an alias", async () => {
		Date.now = vi.fn().mockImplementationOnce(() => FIRST_TICK);

		const service = new AuditableItemGraphService();
		const id = await service.create(
			["foo123", "bar456"],
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
		expect(vertex.changesets?.[0].hash).toEqual("OHtei+KoBigFGB5st19yD2ggnw4nUV2SWC+lfWrFgQk=");

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			vertex.changesets?.[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_ID);
		expect(immutableStore[0].data).toEqual(
			"Spqywh7KrpCiymfDXKNNKXKdqU1+VR/o2eY3a5NBm+qcRmudU3wmxJm0Z1g1dpXjR6nd1FeDGHJKb1XGlr/UAA=="
		);
	});

	test("Can create a vertex with some metadata", async () => {
		Date.now = vi.fn().mockImplementationOnce(() => FIRST_TICK);

		const metadata: IProperty[] = [];
		PropertyHelper.setText(metadata, "description", "This is a test");
		PropertyHelper.setInteger(metadata, "counter", 123);

		const service = new AuditableItemGraphService();
		const id = await service.create(undefined, metadata, TEST_IDENTITY_ID, TEST_NODE_ID);
		expect(id.startsWith("aig:")).toEqual(true);

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex.id.length).toEqual(64);
		expect(vertex.created).toEqual(FIRST_TICK);
		expect(vertex.nodeIdentity).toEqual(TEST_NODE_ID);
		expect(vertex.metadata?.description.value).toEqual("This is a test");
		expect(vertex.metadata?.description.type).toEqual("https://schema.org/Text");
		expect(vertex.metadata?.description.created).toEqual(FIRST_TICK);
		expect(vertex.metadata?.counter.value).toEqual(123);
		expect(vertex.metadata?.counter.type).toEqual("https://schema.org/Integer");
		expect(vertex.metadata?.counter.created).toEqual(FIRST_TICK);
		expect(vertex.changesets?.length).toEqual(1);
		expect(vertex.changesets?.[0].created).toEqual(FIRST_TICK);
		expect(vertex.changesets?.[0].identity).toEqual(TEST_IDENTITY_ID);
		expect(vertex.changesets?.[0].hash).toEqual("Kw6xTtU/+W3A5k5EK1nMbpkPioi8nSbFd51dTuNMJ6A=");

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			vertex.changesets?.[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_ID);
		expect(immutableStore[0].data).toEqual(
			"xywhPVuT2w2RMyuYC0B0rD8/KP6TdXdou7NtRosWFZRTy3ox59sWa/GBcHZHVmcvHKQLZixglLzMg6yhgRXlAw=="
		);
	});

	test("Can get a vertex", async () => {
		Date.now = vi.fn().mockImplementationOnce(() => FIRST_TICK);

		const metadata: IProperty[] = [];
		PropertyHelper.setText(metadata, "description", "This is a test");
		PropertyHelper.setInteger(metadata, "counter", 123);

		const service = new AuditableItemGraphService();
		const id = await service.create(["foo123", "bar456"], metadata, TEST_IDENTITY_ID, TEST_NODE_ID);
		expect(id.startsWith("aig:")).toEqual(true);

		const vertex = await service.get(id);

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
		Date.now = vi.fn().mockImplementationOnce(() => FIRST_TICK);

		const metadata: IProperty[] = [];
		PropertyHelper.setText(metadata, "description", "This is a test");
		PropertyHelper.setInteger(metadata, "counter", 123);

		const service = new AuditableItemGraphService();
		const id = await service.create(["foo123", "bar456"], metadata, TEST_IDENTITY_ID, TEST_NODE_ID);
		expect(id.startsWith("aig:")).toEqual(true);

		const vertex = await service.get(id, { includeChangesets: true });

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
		expect(vertex.changesets?.[0].hash).toEqual("uZSpBHHfUsTCLZlg/jeZ37A23OC78ih1eLk+L88TeEY=");
	});

	test("Can get a vertex include changesets and verify current signature", async () => {
		Date.now = vi.fn().mockImplementationOnce(() => FIRST_TICK);

		const metadata: IProperty[] = [];
		PropertyHelper.setText(metadata, "description", "This is a test");
		PropertyHelper.setInteger(metadata, "counter", 123);

		const service = new AuditableItemGraphService();
		const id = await service.create(["foo123", "bar456"], metadata, TEST_IDENTITY_ID, TEST_NODE_ID);
		expect(id.startsWith("aig:")).toEqual(true);

		const vertex = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: "current"
		});

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
		expect(vertex.changesets?.[0].hash).toEqual("uZSpBHHfUsTCLZlg/jeZ37A23OC78ih1eLk+L88TeEY=");
	});
});
