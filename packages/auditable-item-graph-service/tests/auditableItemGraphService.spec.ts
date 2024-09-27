// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { AuditableItemGraphTypes, VerifyDepth } from "@twin.org/auditable-item-graph-models";
import { RandomHelper } from "@twin.org/core";
import { SchemaOrgTypes } from "@twin.org/data-schema-org";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import {
	EntityStorageImmutableStorageConnector,
	type ImmutableItem,
	initSchema as initSchemaImmutableStorage
} from "@twin.org/immutable-storage-connector-entity-storage";
import { ImmutableStorageConnectorFactory } from "@twin.org/immutable-storage-models";
import { nameof } from "@twin.org/nameof";
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
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
		expect(service).toBeDefined();
	});

	test("Can create a vertex with no properties", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
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
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			nodeIdentity: TEST_NODE_IDENTITY
		});

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [],
			signature:
				"Gn8flHdNYQkt7/rVBffUep6whXAHq6ZGVV7jc9x+51gGr7o9ZPn7iEKefZcHGlMc4fSIDtf3SBNtIsDX8rP1Dg==",
			hash: "NfIGMY96nSnVWu8DXZVtnd+hOP1xu6UGkgEFdwup8YY=",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changeset.immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		const immutableIntegrity = await decodeJwtToIntegrity(immutableStore[0].data);
		expect(immutableIntegrity).toEqual({
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			hash: "NfIGMY96nSnVWu8DXZVtnd+hOP1xu6UGkgEFdwup8YY=",
			signature:
				"Gn8flHdNYQkt7/rVBffUep6whXAHq6ZGVV7jc9x+51gGr7o9ZPn7iEKefZcHGlMc4fSIDtf3SBNtIsDX8rP1Dg==",
			integrity: {
				patches: []
			}
		});
	});

	test("Can create a vertex with an alias", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
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
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			nodeIdentity: TEST_NODE_IDENTITY,
			aliasIndex: "foo123||bar456",
			aliases: [
				{
					id: "foo123",
					dateCreated: "2024-08-22T11:55:16.271Z"
				},
				{
					id: "bar456",
					dateCreated: "2024-08-22T11:55:16.271Z"
				}
			]
		});

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							dateCreated: "2024-08-22T11:55:16.271Z"
						},
						{
							id: "bar456",
							dateCreated: "2024-08-22T11:55:16.271Z"
						}
					]
				}
			],
			hash: "orN0KaNwyaMN/eNCasa5gVdxASLAboEUruNIjKjiVCk=",
			signature:
				"/PSzLQIctmWsOnOy5sOVPS/+HuYxcylJHXm6g+yMOn6CBnjVQAiG1g3eQhnvZnd+/85w5Z35Ml592KTaGBqkAw==",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changeset.immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		const immutableIntegrity = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(immutableIntegrity).toEqual({
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			hash: "orN0KaNwyaMN/eNCasa5gVdxASLAboEUruNIjKjiVCk=",
			signature:
				"/PSzLQIctmWsOnOy5sOVPS/+HuYxcylJHXm6g+yMOn6CBnjVQAiG1g3eQhnvZnd+/85w5Z35Ml592KTaGBqkAw==",
			integrity: {
				patches: [
					{
						op: "add",
						path: "/aliases",
						value: [
							{ dateCreated: "2024-08-22T11:55:16.271Z", id: "foo123" },
							{ dateCreated: "2024-08-22T11:55:16.271Z", id: "bar456" }
						]
					}
				]
			}
		});
	});

	test("Can create a vertex with object", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
		const id = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
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
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			nodeIdentity: TEST_NODE_IDENTITY,
			vertexObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			}
		});

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/vertexObject",
					value: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							type: "Person",
							id: "acct:person@example.org",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			hash: "6ebyliNLGXmMnPyzDqbD6VKpwHsHDVW3/4BCyYuP9kM=",
			signature:
				"/sjU35iIgXNNk3tRhpOppSmJ+p77PpvElRTrsuvxuwzlX9pZgpIzZx2UOZ7pT/XSoHDC+OiH5E6dpRfsB1WJCg==",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changeset.immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		const immutableIntegrity = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(immutableIntegrity).toEqual({
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			hash: "6ebyliNLGXmMnPyzDqbD6VKpwHsHDVW3/4BCyYuP9kM=",
			signature:
				"/sjU35iIgXNNk3tRhpOppSmJ+p77PpvElRTrsuvxuwzlX9pZgpIzZx2UOZ7pT/XSoHDC+OiH5E6dpRfsB1WJCg==",
			integrity: {
				patches: [
					{
						op: "add",
						path: "/vertexObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Create",
							actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
							object: { type: "Note", content: "This is a simple note" },
							published: "2015-01-25T12:34:56Z"
						}
					}
				]
			}
		});
	});

	test("Can get a vertex", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
		const id = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			[{ id: "foo123" }, { id: "bar456" }],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const result = await service.get(id);

		expect(result).toEqual({
			"@context": [AuditableItemGraphTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
			type: AuditableItemGraphTypes.Vertex,
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			nodeIdentity: TEST_NODE_IDENTITY,
			vertexObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{
					type: AuditableItemGraphTypes.Alias,
					id: "foo123",
					dateCreated: "2024-08-22T11:55:16.271Z"
				},
				{
					type: AuditableItemGraphTypes.Alias,
					id: "bar456",
					dateCreated: "2024-08-22T11:55:16.271Z"
				}
			]
		});
	});

	test("Can get a vertex include changesets", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
		const id = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			[
				{ id: "foo123", aliasFormat: "type1" },
				{ id: "bar456", aliasFormat: "type2" }
			],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const result = await service.get(id, { includeChangesets: true });

		expect(result).toEqual({
			"@context": [AuditableItemGraphTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
			type: AuditableItemGraphTypes.Vertex,
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			nodeIdentity: TEST_NODE_IDENTITY,
			vertexObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
				object: { type: "Note", content: "This is a simple note" },
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{
					type: AuditableItemGraphTypes.Alias,
					id: "foo123",
					aliasFormat: "type1",
					dateCreated: "2024-08-22T11:55:16.271Z"
				},
				{
					type: AuditableItemGraphTypes.Alias,
					id: "bar456",
					aliasFormat: "type2",
					dateCreated: "2024-08-22T11:55:16.271Z"
				}
			],
			changesets: [
				{
					type: AuditableItemGraphTypes.Changeset,
					hash: "PCV1mx2STZR7lUaI15MzW9dlEHc7Wqf9vIZ0RVU1hvg=",
					signature:
						"HHdXZdM8XnwVxWKIANLnzfPPke07TnDWOCXcKw/rPa6xyLZ7T/XYxEC/kbEn58/qfdeHU2z1VCXB7cAWmn4vCg==",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					dateCreated: "2024-08-22T11:55:16.271Z",
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{
							type: AuditableItemGraphTypes.PatchOperation,
							patchOperation: "add",
							patchPath: "/vertexObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
								object: { type: "Note", content: "This is a simple note" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							type: AuditableItemGraphTypes.PatchOperation,
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{ id: "foo123", aliasFormat: "type1", dateCreated: "2024-08-22T11:55:16.271Z" },
								{ id: "bar456", aliasFormat: "type2", dateCreated: "2024-08-22T11:55:16.271Z" }
							]
						}
					]
				}
			]
		});

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			hash: "PCV1mx2STZR7lUaI15MzW9dlEHc7Wqf9vIZ0RVU1hvg=",
			signature:
				"HHdXZdM8XnwVxWKIANLnzfPPke07TnDWOCXcKw/rPa6xyLZ7T/XYxEC/kbEn58/qfdeHU2z1VCXB7cAWmn4vCg==",
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/vertexObject",
					value: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
						object: { type: "Note", content: "This is a simple note" },
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{ id: "foo123", aliasFormat: "type1", dateCreated: "2024-08-22T11:55:16.271Z" },
						{ id: "bar456", aliasFormat: "type2", dateCreated: "2024-08-22T11:55:16.271Z" }
					]
				}
			],
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});
	});

	test("Can get a vertex include changesets and verify current signature", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
		const id = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
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

		expect(result).toEqual({
			"@context": [AuditableItemGraphTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
			type: AuditableItemGraphTypes.Vertex,
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			nodeIdentity: TEST_NODE_IDENTITY,
			vertexObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
				object: { type: "Note", content: "This is a simple note" },
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ type: "AuditableItemGraphAlias", id: "foo123", dateCreated: "2024-08-22T11:55:16.271Z" },
				{ type: "AuditableItemGraphAlias", id: "bar456", dateCreated: "2024-08-22T11:55:16.271Z" }
			],
			changesets: [
				{
					type: "AuditableItemGraphChangeset",
					hash: "A19UP24jHInbFaM5rj0TXqBC25ZfkVNs+6fLOmYLG1A=",
					signature:
						"R/xumvccKc/eFewOMO+xL/6M2utP18p/AIWm6pxpnKuHD/B07rqkVHQYt71lIChEAPy86Y4a4MThkz2lel9oAg==",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					dateCreated: "2024-08-22T11:55:16.271Z",
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/vertexObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
								object: { type: "Note", content: "This is a simple note" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{ id: "foo123", dateCreated: "2024-08-22T11:55:16.271Z" },
								{ id: "bar456", dateCreated: "2024-08-22T11:55:16.271Z" }
							]
						}
					],
					verification: {
						type: "AuditableItemGraphVerification",
						state: "ok",
						dateCreated: "2024-08-22T11:55:16.271Z"
					}
				}
			],
			verified: true
		});

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/vertexObject",
					value: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							type: "Person",
							id: "acct:person@example.org",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							dateCreated: "2024-08-22T11:55:16.271Z"
						},
						{
							id: "bar456",
							dateCreated: "2024-08-22T11:55:16.271Z"
						}
					]
				}
			],
			hash: "A19UP24jHInbFaM5rj0TXqBC25ZfkVNs+6fLOmYLG1A=",
			signature:
				"R/xumvccKc/eFewOMO+xL/6M2utP18p/AIWm6pxpnKuHD/B07rqkVHQYt71lIChEAPy86Y4a4MThkz2lel9oAg==",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});
	});

	test("Can create and update with no changes and verify", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
		const id = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
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
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
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

		expect(result).toEqual({
			"@context": ["https://schema.twindev.org/aig/", "https://schema.org/"],
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			aliases: [
				{ id: "foo123", type: "AuditableItemGraphAlias", dateCreated: "2024-08-22T11:55:16.271Z" },
				{ id: "bar456", type: "AuditableItemGraphAlias", dateCreated: "2024-08-22T11:55:16.271Z" }
			],
			changesets: [
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:55:16.271Z",
					hash: "A19UP24jHInbFaM5rj0TXqBC25ZfkVNs+6fLOmYLG1A=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/vertexObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
								object: { type: "Note", content: "This is a simple note" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{ id: "foo123", dateCreated: "2024-08-22T11:55:16.271Z" },
								{ id: "bar456", dateCreated: "2024-08-22T11:55:16.271Z" }
							]
						}
					],
					verification: {
						type: "AuditableItemGraphVerification",
						dateCreated: "2024-08-22T11:55:16.271Z",
						state: "ok"
					},
					signature:
						"R/xumvccKc/eFewOMO+xL/6M2utP18p/AIWm6pxpnKuHD/B07rqkVHQYt71lIChEAPy86Y4a4MThkz2lel9oAg==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true,
			vertexObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
				object: { type: "Note", content: "This is a simple note" },
				published: "2015-01-25T12:34:56Z"
			}
		});

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			hash: "A19UP24jHInbFaM5rj0TXqBC25ZfkVNs+6fLOmYLG1A=",
			signature:
				"R/xumvccKc/eFewOMO+xL/6M2utP18p/AIWm6pxpnKuHD/B07rqkVHQYt71lIChEAPy86Y4a4MThkz2lel9oAg==",
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			patches: [
				{
					op: "add",
					path: "/vertexObject",
					value: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
						object: { type: "Note", content: "This is a simple note" },
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{ id: "foo123", dateCreated: "2024-08-22T11:55:16.271Z" },
						{ id: "bar456", dateCreated: "2024-08-22T11:55:16.271Z" }
					]
				}
			],
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});
	});

	test("Can create and update and verify aliases", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
		const id = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
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
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			[{ id: "foo321" }, { id: "bar456" }],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const result = await service.get(id, {
			includeChangesets: true,
			includeDeleted: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toEqual({
			"@context": ["https://schema.twindev.org/aig/", "https://schema.org/"],
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			aliases: [
				{
					type: "AuditableItemGraphAlias",
					id: "foo123",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateDeleted: "2024-08-22T11:56:56.272Z"
				},
				{ type: "AuditableItemGraphAlias", id: "bar456", dateCreated: "2024-08-22T11:55:16.271Z" },
				{ type: "AuditableItemGraphAlias", id: "foo321", dateCreated: "2024-08-22T11:56:56.272Z" }
			],
			changesets: [
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:55:16.271Z",
					hash: "A19UP24jHInbFaM5rj0TXqBC25ZfkVNs+6fLOmYLG1A=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/vertexObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
								object: { type: "Note", content: "This is a simple note" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{ id: "foo123", dateCreated: "2024-08-22T11:55:16.271Z" },
								{ id: "bar456", dateCreated: "2024-08-22T11:55:16.271Z" }
							]
						}
					],
					verification: {
						type: "AuditableItemGraphVerification",
						dateCreated: "2024-08-22T11:55:16.271Z",
						state: "ok"
					},
					signature:
						"R/xumvccKc/eFewOMO+xL/6M2utP18p/AIWm6pxpnKuHD/B07rqkVHQYt71lIChEAPy86Y4a4MThkz2lel9oAg==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					hash: "PhHTg8+chkBxNkyxWGpommPRmhRZ3lmeSDPuuAltdnY=",
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases/0/dateDeleted",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases/-",
							patchValue: { id: "foo321", dateCreated: "2024-08-22T11:56:56.272Z" }
						}
					],
					verification: {
						type: "AuditableItemGraphVerification",
						dateCreated: "2024-08-22T11:56:56.272Z",
						state: "ok"
					},
					signature:
						"t94nlYBCXIUnXUdVPH6T+HId6OIAALxR+8yYMqHHhHaHKLHgzvNHWZlU6r8lDhwoBO/sC1EXQqZ8h+k7yXbdBQ==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true,
			vertexObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
				object: { type: "Note", content: "This is a simple note" },
				published: "2015-01-25T12:34:56Z"
			}
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/vertexObject",
					value: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							type: "Person",
							id: "acct:person@example.org",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							dateCreated: "2024-08-22T11:55:16.271Z"
						},
						{
							id: "bar456",
							dateCreated: "2024-08-22T11:55:16.271Z"
						}
					]
				}
			],
			hash: "A19UP24jHInbFaM5rj0TXqBC25ZfkVNs+6fLOmYLG1A=",
			signature:
				"R/xumvccKc/eFewOMO+xL/6M2utP18p/AIWm6pxpnKuHD/B07rqkVHQYt71lIChEAPy86Y4a4MThkz2lel9oAg==",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		expect(changesetStore[1]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:56:56.272Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/aliases/0/dateDeleted",
					value: "2024-08-22T11:56:56.272Z"
				},
				{
					op: "add",
					path: "/aliases/-",
					value: {
						id: "foo321",
						dateCreated: "2024-08-22T11:56:56.272Z"
					}
				}
			],
			hash: "PhHTg8+chkBxNkyxWGpommPRmhRZ3lmeSDPuuAltdnY=",
			signature:
				"t94nlYBCXIUnXUdVPH6T+HId6OIAALxR+8yYMqHHhHaHKLHgzvNHWZlU6r8lDhwoBO/sC1EXQqZ8h+k7yXbdBQ==",
			immutableStorageId:
				"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changesetStore[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		let immutableIntegrity = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(immutableIntegrity).toEqual({
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			hash: "A19UP24jHInbFaM5rj0TXqBC25ZfkVNs+6fLOmYLG1A=",
			signature:
				"R/xumvccKc/eFewOMO+xL/6M2utP18p/AIWm6pxpnKuHD/B07rqkVHQYt71lIChEAPy86Y4a4MThkz2lel9oAg==",
			integrity: {
				patches: [
					{
						op: "add",
						path: "/vertexObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Create",
							actor: {
								id: "acct:person@example.org",
								type: "Person",
								name: "Person"
							},
							object: {
								type: "Note",
								content: "This is a simple note"
							},
							published: "2015-01-25T12:34:56Z"
						}
					},
					{
						op: "add",
						path: "/aliases",
						value: [
							{
								dateCreated: "2024-08-22T11:55:16.271Z",
								id: "foo123"
							},
							{
								dateCreated: "2024-08-22T11:55:16.271Z",
								id: "bar456"
							}
						]
					}
				]
			}
		});

		immutableIntegrity = await decodeJwtToIntegrity(immutableStore[1].data);

		expect(immutableIntegrity).toEqual({
			dateCreated: "2024-08-22T11:56:56.272Z",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			hash: "PhHTg8+chkBxNkyxWGpommPRmhRZ3lmeSDPuuAltdnY=",
			signature:
				"t94nlYBCXIUnXUdVPH6T+HId6OIAALxR+8yYMqHHhHaHKLHgzvNHWZlU6r8lDhwoBO/sC1EXQqZ8h+k7yXbdBQ==",
			integrity: {
				patches: [
					{
						op: "add",
						path: "/aliases/0/dateDeleted",
						value: "2024-08-22T11:56:56.272Z"
					},
					{
						op: "add",
						path: "/aliases/-",
						value: {
							dateCreated: "2024-08-22T11:56:56.272Z",
							id: "foo321"
						}
					}
				]
			}
		});
	});

	test("Can create and update and verify aliases and object", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
		const id = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
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
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note 2"
				},
				published: "2015-01-25T12:34:56Z"
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

		expect(result).toEqual({
			"@context": ["https://schema.twindev.org/aig/", "https://schema.org/"],
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			aliases: [
				{
					id: "foo123",
					type: "AuditableItemGraphAlias",
					dateCreated: "2024-08-22T11:55:16.271Z"
				},
				{
					id: "bar456",
					type: "AuditableItemGraphAlias",
					dateCreated: "2024-08-22T11:55:16.271Z"
				}
			],
			changesets: [
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:55:16.271Z",
					hash: "A19UP24jHInbFaM5rj0TXqBC25ZfkVNs+6fLOmYLG1A=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/vertexObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: {
									type: "Person",
									id: "acct:person@example.org",
									name: "Person"
								},
								object: {
									type: "Note",
									content: "This is a simple note"
								},
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{
									id: "foo123",
									dateCreated: "2024-08-22T11:55:16.271Z"
								},
								{
									id: "bar456",
									dateCreated: "2024-08-22T11:55:16.271Z"
								}
							]
						}
					],
					verification: {
						type: "AuditableItemGraphVerification",
						dateCreated: "2024-08-22T11:55:16.271Z",
						state: "ok"
					},
					signature:
						"R/xumvccKc/eFewOMO+xL/6M2utP18p/AIWm6pxpnKuHD/B07rqkVHQYt71lIChEAPy86Y4a4MThkz2lel9oAg==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					hash: "ZBIfStzitzSpdJ/nocvSVFqheKzAQrgyHxugizSbrgE=",
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/vertexObject/object/content",
							patchValue: "This is a simple note 2"
						}
					],
					verification: {
						type: "AuditableItemGraphVerification",
						dateCreated: "2024-08-22T11:56:56.272Z",
						state: "ok"
					},
					signature:
						"cmoVe6HQvvYuF+7EiJIUzOnQ1UnQSfiYkhlnhDOeMcAtU1jGAsSBX+T2SDS8aY4EViemexZuc15DRkDnKXF+AA==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true,
			vertexObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					id: "acct:person@example.org",
					type: "Person",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note 2"
				},
				published: "2015-01-25T12:34:56Z"
			}
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/vertexObject",
					value: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							type: "Person",
							id: "acct:person@example.org",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							dateCreated: "2024-08-22T11:55:16.271Z"
						},
						{
							id: "bar456",
							dateCreated: "2024-08-22T11:55:16.271Z"
						}
					]
				}
			],
			hash: "A19UP24jHInbFaM5rj0TXqBC25ZfkVNs+6fLOmYLG1A=",
			signature:
				"R/xumvccKc/eFewOMO+xL/6M2utP18p/AIWm6pxpnKuHD/B07rqkVHQYt71lIChEAPy86Y4a4MThkz2lel9oAg==",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		expect(changesetStore[1]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:56:56.272Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "replace",
					path: "/vertexObject/object/content",
					value: "This is a simple note 2"
				}
			],
			hash: "ZBIfStzitzSpdJ/nocvSVFqheKzAQrgyHxugizSbrgE=",
			signature:
				"cmoVe6HQvvYuF+7EiJIUzOnQ1UnQSfiYkhlnhDOeMcAtU1jGAsSBX+T2SDS8aY4EViemexZuc15DRkDnKXF+AA==",
			immutableStorageId:
				"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
		});

		const immutableStore = immutableStorage.getStore();
		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changesetStore[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		const immutableIntegrity = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(immutableIntegrity).toEqual({
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			hash: "A19UP24jHInbFaM5rj0TXqBC25ZfkVNs+6fLOmYLG1A=",
			signature:
				"R/xumvccKc/eFewOMO+xL/6M2utP18p/AIWm6pxpnKuHD/B07rqkVHQYt71lIChEAPy86Y4a4MThkz2lel9oAg==",
			integrity: {
				patches: [
					{
						op: "add",
						path: "/vertexObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Create",
							actor: {
								id: "acct:person@example.org",
								type: "Person",
								name: "Person"
							},
							object: {
								type: "Note",
								content: "This is a simple note"
							},
							published: "2015-01-25T12:34:56Z"
						}
					},
					{
						op: "add",
						path: "/aliases",
						value: [
							{
								dateCreated: "2024-08-22T11:55:16.271Z",
								id: "foo123"
							},
							{
								dateCreated: "2024-08-22T11:55:16.271Z",
								id: "bar456"
							}
						]
					}
				]
			}
		});
	});

	test("Can create and update and verify aliases and object", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
		const id = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			[{ id: "foo123" }, { id: "bar456" }],
			[
				{
					id: "resource1",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							type: "Person",
							id: "acct:person@example.org",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "resource2",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							type: "Person",
							id: "acct:person@example.org",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource 2"
						},
						published: "2015-01-25T12:34:56Z"
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
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					type: "Person",
					id: "acct:person@example.org",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note 2"
				},
				published: "2015-01-25T12:34:56Z"
			},
			[{ id: "foo123" }, { id: "bar456" }],
			[
				{
					id: "resource1",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							type: "Person",
							id: "acct:person@example.org",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource 10"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "resource2",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							type: "Person",
							id: "acct:person@example.org",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource 11"
						},
						published: "2015-01-25T12:34:56Z"
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

		expect(result).toEqual({
			"@context": ["https://schema.twindev.org/aig/", "https://schema.org/"],
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			aliases: [
				{
					id: "foo123",
					type: "AuditableItemGraphAlias",
					dateCreated: "2024-08-22T11:55:16.271Z"
				},
				{
					id: "bar456",
					type: "AuditableItemGraphAlias",
					dateCreated: "2024-08-22T11:55:16.271Z"
				}
			],
			changesets: [
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:55:16.271Z",
					hash: "qnNrA/UnqdVqB6l+TG3TaSu74NzclH0GDJrc9hz/Yrk=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/vertexObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: {
									type: "Person",
									id: "acct:person@example.org",
									name: "Person"
								},
								object: {
									type: "Note",
									content: "This is a simple note"
								},
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{
									id: "foo123",
									dateCreated: "2024-08-22T11:55:16.271Z"
								},
								{
									id: "bar456",
									dateCreated: "2024-08-22T11:55:16.271Z"
								}
							]
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/resources",
							patchValue: [
								{
									id: "resource1",
									dateCreated: "2024-08-22T11:55:16.271Z",
									resourceObject: {
										"@context": "https://www.w3.org/ns/activitystreams",
										type: "Create",
										actor: {
											type: "Person",
											id: "acct:person@example.org",
											name: "Person"
										},
										object: {
											type: "Note",
											content: "This is a simple note resource"
										},
										published: "2015-01-25T12:34:56Z"
									}
								},
								{
									id: "resource2",
									dateCreated: "2024-08-22T11:55:16.271Z",
									resourceObject: {
										"@context": "https://www.w3.org/ns/activitystreams",
										type: "Create",
										actor: {
											type: "Person",
											id: "acct:person@example.org",
											name: "Person"
										},
										object: {
											type: "Note",
											content: "This is a simple note resource 2"
										},
										published: "2015-01-25T12:34:56Z"
									}
								}
							]
						}
					],
					verification: {
						type: "AuditableItemGraphVerification",
						dateCreated: "2024-08-22T11:55:16.271Z",
						state: "ok"
					},
					signature:
						"ixxwqpTLXWwaPKUKiCqNxD9V5GfDEJj/H+K8VrL+0JSWLxEd3IKEZZTkiW6RBqhqAWdol2wzMVHm1Zpz3slMCg==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					hash: "Tk0r0AbswKLvcPNDBpxsHMGwGec5lx+gEBY5a8GAIOU=",
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/vertexObject/object/content",
							patchValue: "This is a simple note 2"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/resources/0/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/resources/0/resourceObject/object/content",
							patchValue: "This is a simple note resource 10"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/resources/1/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/resources/1/resourceObject/object/content",
							patchValue: "This is a simple note resource 11"
						}
					],
					verification: {
						type: "AuditableItemGraphVerification",
						dateCreated: "2024-08-22T11:56:56.272Z",
						state: "ok"
					},
					signature:
						"JRs8s2q6/VfqDLamoGImJiVcaNWtpzRjuJf9/x5FVBvQXjD8lgVnLt4Bi5bjVlUwFWtIKhbTcm8N/GICRkuJDA==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			resources: [
				{
					type: "AuditableItemGraphResource",
					id: "resource1",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource 10"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					type: "AuditableItemGraphResource",
					id: "resource2",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource 11"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			verified: true,
			vertexObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					id: "acct:person@example.org",
					type: "Person",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note 2"
				},
				published: "2015-01-25T12:34:56Z"
			}
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/vertexObject",
					value: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							type: "Person",
							id: "acct:person@example.org",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							dateCreated: "2024-08-22T11:55:16.271Z"
						},
						{
							id: "bar456",
							dateCreated: "2024-08-22T11:55:16.271Z"
						}
					]
				},
				{
					op: "add",
					path: "/resources",
					value: [
						{
							id: "resource1",
							dateCreated: "2024-08-22T11:55:16.271Z",
							resourceObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: {
									type: "Person",
									id: "acct:person@example.org",
									name: "Person"
								},
								object: {
									type: "Note",
									content: "This is a simple note resource"
								},
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							id: "resource2",
							dateCreated: "2024-08-22T11:55:16.271Z",
							resourceObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: {
									type: "Person",
									id: "acct:person@example.org",
									name: "Person"
								},
								object: {
									type: "Note",
									content: "This is a simple note resource 2"
								},
								published: "2015-01-25T12:34:56Z"
							}
						}
					]
				}
			],
			hash: "qnNrA/UnqdVqB6l+TG3TaSu74NzclH0GDJrc9hz/Yrk=",
			signature:
				"ixxwqpTLXWwaPKUKiCqNxD9V5GfDEJj/H+K8VrL+0JSWLxEd3IKEZZTkiW6RBqhqAWdol2wzMVHm1Zpz3slMCg==",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		expect(changesetStore[1]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:56:56.272Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "replace",
					path: "/vertexObject/object/content",
					value: "This is a simple note 2"
				},
				{
					op: "add",
					path: "/resources/0/dateModified",
					value: "2024-08-22T11:56:56.272Z"
				},
				{
					op: "replace",
					path: "/resources/0/resourceObject/object/content",
					value: "This is a simple note resource 10"
				},
				{
					op: "add",
					path: "/resources/1/dateModified",
					value: "2024-08-22T11:56:56.272Z"
				},
				{
					op: "replace",
					path: "/resources/1/resourceObject/object/content",
					value: "This is a simple note resource 11"
				}
			],
			hash: "Tk0r0AbswKLvcPNDBpxsHMGwGec5lx+gEBY5a8GAIOU=",
			signature:
				"JRs8s2q6/VfqDLamoGImJiVcaNWtpzRjuJf9/x5FVBvQXjD8lgVnLt4Bi5bjVlUwFWtIKhbTcm8N/GICRkuJDA==",
			immutableStorageId:
				"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
		});

		const immutableStore = immutableStorage.getStore();
		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changesetStore[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		let immutableIntegrity = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(immutableIntegrity).toEqual({
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			hash: "qnNrA/UnqdVqB6l+TG3TaSu74NzclH0GDJrc9hz/Yrk=",
			signature:
				"ixxwqpTLXWwaPKUKiCqNxD9V5GfDEJj/H+K8VrL+0JSWLxEd3IKEZZTkiW6RBqhqAWdol2wzMVHm1Zpz3slMCg==",
			integrity: {
				patches: [
					{
						op: "add",
						path: "/vertexObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Create",
							actor: {
								id: "acct:person@example.org",
								type: "Person",
								name: "Person"
							},
							object: {
								type: "Note",
								content: "This is a simple note"
							},
							published: "2015-01-25T12:34:56Z"
						}
					},
					{
						op: "add",
						path: "/aliases",
						value: [
							{
								dateCreated: "2024-08-22T11:55:16.271Z",
								id: "foo123"
							},
							{
								dateCreated: "2024-08-22T11:55:16.271Z",
								id: "bar456"
							}
						]
					},
					{
						op: "add",
						path: "/resources",
						value: [
							{
								dateCreated: "2024-08-22T11:55:16.271Z",
								id: "resource1",
								resourceObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: {
										id: "acct:person@example.org",
										type: "Person",
										name: "Person"
									},
									object: {
										type: "Note",
										content: "This is a simple note resource"
									},
									published: "2015-01-25T12:34:56Z"
								}
							},
							{
								dateCreated: "2024-08-22T11:55:16.271Z",
								id: "resource2",
								resourceObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: {
										id: "acct:person@example.org",
										type: "Person",
										name: "Person"
									},
									object: {
										type: "Note",
										content: "This is a simple note resource 2"
									},
									published: "2015-01-25T12:34:56Z"
								}
							}
						]
					}
				]
			}
		});

		immutableIntegrity = await decodeJwtToIntegrity(immutableStore[1].data);
		expect(immutableIntegrity).toEqual({
			dateCreated: "2024-08-22T11:56:56.272Z",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			hash: "Tk0r0AbswKLvcPNDBpxsHMGwGec5lx+gEBY5a8GAIOU=",
			signature:
				"JRs8s2q6/VfqDLamoGImJiVcaNWtpzRjuJf9/x5FVBvQXjD8lgVnLt4Bi5bjVlUwFWtIKhbTcm8N/GICRkuJDA==",
			integrity: {
				patches: [
					{
						op: "replace",
						path: "/vertexObject/object/content",
						value: "This is a simple note 2"
					},
					{
						op: "add",
						path: "/resources/0/dateModified",
						value: "2024-08-22T11:56:56.272Z"
					},
					{
						op: "replace",
						path: "/resources/0/resourceObject/object/content",
						value: "This is a simple note resource 10"
					},
					{
						op: "add",
						path: "/resources/1/dateModified",
						value: "2024-08-22T11:56:56.272Z"
					},
					{
						op: "replace",
						path: "/resources/1/resourceObject/object/content",
						value: "This is a simple note resource 11"
					}
				]
			}
		});
	});

	test("Can create and update and verify edges", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
		const id = await service.create(
			undefined,
			undefined,
			undefined,
			[
				{
					id: "edge1",
					edgeRelationship: "friend",
					edgeObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note"
						},
						published: "2015-01-25T12:34:56Z"
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
					edgeRelationship: "frenemy",
					edgeObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note 2"
						},
						published: "2015-01-25T12:34:56Z"
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

		expect(result).toEqual({
			"@context": ["https://schema.twindev.org/aig/", "https://schema.org/"],
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			changesets: [
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:55:16.271Z",
					hash: "iOxF5z/VREtUG2jNQBpE3soniV76l0uoj6ETOhvm8bw=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/edges",
							patchValue: {
								id: "edge1",
								dateCreated: "2024-08-22T11:55:16.271Z",
								edgeObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
									object: { type: "Note", content: "This is a simple note" },
									published: "2015-01-25T12:34:56Z"
								},
								edgeRelationship: "friend"
							}
						}
					],
					verification: {
						type: "AuditableItemGraphVerification",
						dateCreated: "2024-08-22T11:55:16.271Z",
						state: "ok"
					},
					signature:
						"mEPcZvMpTCPRSeNJAVLe2+95USPLp+wLzddPfXS3KKlg489uFmRUOW3a+JtAtc4WAG0P9vCHakwYPHmqcuNiDQ==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					hash: "5pLwHfmiDtGHvE5bp19sef0WyOAgT9gPiDPDFLKuOpI=",
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/edges/0/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/edges/0/edgeObject/object/content",
							patchValue: "This is a simple note 2"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/edges/0/edgeRelationship",
							patchValue: "frenemy"
						}
					],
					verification: {
						type: "AuditableItemGraphVerification",
						dateCreated: "2024-08-22T11:56:56.272Z",
						state: "ok"
					},
					signature:
						"okNTHo201zQbLp014+lmULUfwD07EK6K0gHduEd5MHiX9RmvoA3V9scozkS0NrGVDLPlfBVcVdeK7PNPyf91AA==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			edges: [
				{
					id: "edge1",
					type: "AuditableItemGraphEdge",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					edgeObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note 2" },
						published: "2015-01-25T12:34:56Z"
					},
					edgeRelationship: "frenemy"
				}
			],
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			hash: "iOxF5z/VREtUG2jNQBpE3soniV76l0uoj6ETOhvm8bw=",
			signature:
				"mEPcZvMpTCPRSeNJAVLe2+95USPLp+wLzddPfXS3KKlg489uFmRUOW3a+JtAtc4WAG0P9vCHakwYPHmqcuNiDQ==",
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			patches: [
				{
					op: "add",
					path: "/edges",
					value: [
						{
							id: "edge1",
							dateCreated: "2024-08-22T11:55:16.271Z",
							edgeObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: {
									id: "acct:person@example.org",
									type: "Person",
									name: "Person"
								},
								object: {
									type: "Note",
									content: "This is a simple note"
								},
								published: "2015-01-25T12:34:56Z"
							},
							edgeRelationship: "friend"
						}
					]
				}
			],
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		expect(changesetStore[1]).toEqual({
			hash: "5pLwHfmiDtGHvE5bp19sef0WyOAgT9gPiDPDFLKuOpI=",
			signature:
				"okNTHo201zQbLp014+lmULUfwD07EK6K0gHduEd5MHiX9RmvoA3V9scozkS0NrGVDLPlfBVcVdeK7PNPyf91AA==",
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:56:56.272Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{ op: "add", path: "/edges/0/dateModified", value: "2024-08-22T11:56:56.272Z" },
				{
					op: "replace",
					path: "/edges/0/edgeObject/object/content",
					value: "This is a simple note 2"
				},
				{ op: "replace", path: "/edges/0/edgeRelationship", value: "frenemy" }
			],
			immutableStorageId:
				"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
		});
	});

	test("Can create and update and verify aliases, object, resources and edges", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
		const id = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					id: "acct:person@example.org",
					type: "Person",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			[
				{
					id: "foo123",
					aliasObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple alias 1"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "bar456",
					aliasObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note alias 2"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			[
				{
					id: "resource1",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource 1"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "resource2",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple resource 2"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			[
				{
					id: "edge1",
					edgeRelationship: "friend",
					edgeObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple edge 1"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "edge2",
					edgeRelationship: "enemy",
					edgeObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple edge 2"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			id,
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					id: "acct:person@example.org",
					type: "Person",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note 2"
				},
				published: "2015-01-25T12:34:56Z"
			},
			[
				{
					id: "foo123",
					aliasObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note alias 10"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "bar456",
					aliasObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note alias 20"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			[
				{
					id: "resource1",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource 10"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "resource2",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note resource 20"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			[
				{
					id: "edge1",
					edgeRelationship: "friend",
					edgeObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note edge 10"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "edge2",
					edgeRelationship: "enemy",
					edgeObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: {
							id: "acct:person@example.org",
							type: "Person",
							name: "Person"
						},
						object: {
							type: "Note",
							content: "This is a simple note edge 20"
						},
						published: "2015-01-25T12:34:56Z"
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

		expect(result).toEqual({
			"@context": ["https://schema.twindev.org/aig/", "https://schema.org/"],
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			aliases: [
				{
					id: "foo123",
					type: "AuditableItemGraphAlias",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					aliasObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note alias 10" },
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "bar456",
					type: "AuditableItemGraphAlias",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					aliasObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note alias 20" },
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			changesets: [
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:55:16.271Z",
					hash: "CLw23qg3ZXjZTS+YhMae/z5lw6Hs1a9wCXQ59M/VL38=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/vertexObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
								object: { type: "Note", content: "This is a simple note" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{
									id: "foo123",
									dateCreated: "2024-08-22T11:55:16.271Z",
									aliasObject: {
										"@context": "https://www.w3.org/ns/activitystreams",
										type: "Create",
										actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
										object: { type: "Note", content: "This is a simple alias 1" },
										published: "2015-01-25T12:34:56Z"
									}
								},
								{
									id: "bar456",
									dateCreated: "2024-08-22T11:55:16.271Z",
									aliasObject: {
										"@context": "https://www.w3.org/ns/activitystreams",
										type: "Create",
										actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
										object: { type: "Note", content: "This is a simple note alias 2" },
										published: "2015-01-25T12:34:56Z"
									}
								}
							]
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/resources",
							patchValue: [
								{
									id: "resource1",
									dateCreated: "2024-08-22T11:55:16.271Z",
									resourceObject: {
										"@context": "https://www.w3.org/ns/activitystreams",
										type: "Create",
										actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
										object: { type: "Note", content: "This is a simple note resource 1" },
										published: "2015-01-25T12:34:56Z"
									}
								},
								{
									id: "resource2",
									dateCreated: "2024-08-22T11:55:16.271Z",
									resourceObject: {
										"@context": "https://www.w3.org/ns/activitystreams",
										type: "Create",
										actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
										object: { type: "Note", content: "This is a simple resource 2" },
										published: "2015-01-25T12:34:56Z"
									}
								}
							]
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/edges",
							patchValue: [
								{
									id: "edge1",
									dateCreated: "2024-08-22T11:55:16.271Z",
									edgeObject: {
										"@context": "https://www.w3.org/ns/activitystreams",
										type: "Create",
										actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
										object: { type: "Note", content: "This is a simple edge 1" },
										published: "2015-01-25T12:34:56Z"
									},
									edgeRelationship: "friend"
								},
								{
									id: "edge2",
									dateCreated: "2024-08-22T11:55:16.271Z",
									edgeObject: {
										"@context": "https://www.w3.org/ns/activitystreams",
										type: "Create",
										actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
										object: { type: "Note", content: "This is a simple edge 2" },
										published: "2015-01-25T12:34:56Z"
									},
									edgeRelationship: "enemy"
								}
							]
						}
					],
					verification: {
						type: "AuditableItemGraphVerification",
						dateCreated: "2024-08-22T11:55:16.271Z",
						state: "ok"
					},
					signature:
						"ybxXW6P5ospZs/z0ulFvs55ZgRfnj1oMgSSxjeCVR3THfhfcEuLbQJeFxgfmK+0NWOB2TG/u/kcGsVGlyMSyDw==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					hash: "ank774DVi2rngvo6+QjKeN9mghB5UC7pvWBbBwXuFUs=",
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/vertexObject/object/content",
							patchValue: "This is a simple note 2"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases/0/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/aliases/0/aliasObject/object/content",
							patchValue: "This is a simple note alias 10"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases/1/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/aliases/1/aliasObject/object/content",
							patchValue: "This is a simple note alias 20"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/resources/0/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/resources/0/resourceObject/object/content",
							patchValue: "This is a simple note resource 10"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/resources/1/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/resources/1/resourceObject/object/content",
							patchValue: "This is a simple note resource 20"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/edges/0/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/edges/0/edgeObject/object/content",
							patchValue: "This is a simple note edge 10"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/edges/1/dateModified",
							patchValue: "2024-08-22T11:56:56.272Z"
						},
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/edges/1/edgeObject/object/content",
							patchValue: "This is a simple note edge 20"
						}
					],
					verification: {
						type: "AuditableItemGraphVerification",
						dateCreated: "2024-08-22T11:56:56.272Z",
						state: "ok"
					},
					signature:
						"pNpgeKqAmkLzvOpQcTb6Or9kPa+RasosaY0I/StCu3JhcmHqiSwA+GKIYgSR1A5IBEkthV1JHc1l7NbCsz86CA==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			edges: [
				{
					id: "edge1",
					type: "AuditableItemGraphEdge",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					edgeObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note edge 10" },
						published: "2015-01-25T12:34:56Z"
					},
					edgeRelationship: "friend"
				},
				{
					id: "edge2",
					type: "AuditableItemGraphEdge",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					edgeObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note edge 20" },
						published: "2015-01-25T12:34:56Z"
					},
					edgeRelationship: "enemy"
				}
			],
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			resources: [
				{
					id: "resource1",
					type: "AuditableItemGraphResource",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note resource 10" },
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "resource2",
					type: "AuditableItemGraphResource",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note resource 20" },
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			verified: true,
			vertexObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
				object: { type: "Note", content: "This is a simple note 2" },
				published: "2015-01-25T12:34:56Z"
			}
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			hash: "CLw23qg3ZXjZTS+YhMae/z5lw6Hs1a9wCXQ59M/VL38=",
			signature:
				"ybxXW6P5ospZs/z0ulFvs55ZgRfnj1oMgSSxjeCVR3THfhfcEuLbQJeFxgfmK+0NWOB2TG/u/kcGsVGlyMSyDw==",
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/vertexObject",
					value: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note" },
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					op: "add",
					path: "/aliases",
					value: [
						{
							id: "foo123",
							dateCreated: "2024-08-22T11:55:16.271Z",
							aliasObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
								object: { type: "Note", content: "This is a simple alias 1" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							id: "bar456",
							dateCreated: "2024-08-22T11:55:16.271Z",
							aliasObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
								object: { type: "Note", content: "This is a simple note alias 2" },
								published: "2015-01-25T12:34:56Z"
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
							dateCreated: "2024-08-22T11:55:16.271Z",
							resourceObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
								object: { type: "Note", content: "This is a simple note resource 1" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							id: "resource2",
							dateCreated: "2024-08-22T11:55:16.271Z",
							resourceObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
								object: { type: "Note", content: "This is a simple resource 2" },
								published: "2015-01-25T12:34:56Z"
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
							dateCreated: "2024-08-22T11:55:16.271Z",
							edgeObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
								object: { type: "Note", content: "This is a simple edge 1" },
								published: "2015-01-25T12:34:56Z"
							},
							edgeRelationship: "friend"
						},
						{
							id: "edge2",
							dateCreated: "2024-08-22T11:55:16.271Z",
							edgeObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								type: "Create",
								actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
								object: { type: "Note", content: "This is a simple edge 2" },
								published: "2015-01-25T12:34:56Z"
							},
							edgeRelationship: "enemy"
						}
					]
				}
			],
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		expect(changesetStore[1]).toEqual({
			hash: "ank774DVi2rngvo6+QjKeN9mghB5UC7pvWBbBwXuFUs=",
			signature:
				"pNpgeKqAmkLzvOpQcTb6Or9kPa+RasosaY0I/StCu3JhcmHqiSwA+GKIYgSR1A5IBEkthV1JHc1l7NbCsz86CA==",
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:56:56.272Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{ op: "replace", path: "/vertexObject/object/content", value: "This is a simple note 2" },
				{ op: "add", path: "/aliases/0/dateModified", value: "2024-08-22T11:56:56.272Z" },
				{
					op: "replace",
					path: "/aliases/0/aliasObject/object/content",
					value: "This is a simple note alias 10"
				},
				{ op: "add", path: "/aliases/1/dateModified", value: "2024-08-22T11:56:56.272Z" },
				{
					op: "replace",
					path: "/aliases/1/aliasObject/object/content",
					value: "This is a simple note alias 20"
				},
				{ op: "add", path: "/resources/0/dateModified", value: "2024-08-22T11:56:56.272Z" },
				{
					op: "replace",
					path: "/resources/0/resourceObject/object/content",
					value: "This is a simple note resource 10"
				},
				{ op: "add", path: "/resources/1/dateModified", value: "2024-08-22T11:56:56.272Z" },
				{
					op: "replace",
					path: "/resources/1/resourceObject/object/content",
					value: "This is a simple note resource 20"
				},
				{ op: "add", path: "/edges/0/dateModified", value: "2024-08-22T11:56:56.272Z" },
				{
					op: "replace",
					path: "/edges/0/edgeObject/object/content",
					value: "This is a simple note edge 10"
				},
				{ op: "add", path: "/edges/1/dateModified", value: "2024-08-22T11:56:56.272Z" },
				{
					op: "replace",
					path: "/edges/1/edgeObject/object/content",
					value: "This is a simple note edge 20"
				}
			],
			immutableStorageId:
				"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changesetStore[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		let immutableIntegrity = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(immutableIntegrity).toEqual({
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			hash: "CLw23qg3ZXjZTS+YhMae/z5lw6Hs1a9wCXQ59M/VL38=",
			signature:
				"ybxXW6P5ospZs/z0ulFvs55ZgRfnj1oMgSSxjeCVR3THfhfcEuLbQJeFxgfmK+0NWOB2TG/u/kcGsVGlyMSyDw==",
			integrity: {
				patches: [
					{
						op: "add",
						path: "/vertexObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Create",
							actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
							object: { type: "Note", content: "This is a simple note" },
							published: "2015-01-25T12:34:56Z"
						}
					},
					{
						op: "add",
						path: "/aliases",
						value: [
							{
								aliasObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
									object: { type: "Note", content: "This is a simple alias 1" },
									published: "2015-01-25T12:34:56Z"
								},
								dateCreated: "2024-08-22T11:55:16.271Z",
								id: "foo123"
							},
							{
								aliasObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
									object: { type: "Note", content: "This is a simple note alias 2" },
									published: "2015-01-25T12:34:56Z"
								},
								dateCreated: "2024-08-22T11:55:16.271Z",
								id: "bar456"
							}
						]
					},
					{
						op: "add",
						path: "/resources",
						value: [
							{
								dateCreated: "2024-08-22T11:55:16.271Z",
								id: "resource1",
								resourceObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
									object: { type: "Note", content: "This is a simple note resource 1" },
									published: "2015-01-25T12:34:56Z"
								}
							},
							{
								dateCreated: "2024-08-22T11:55:16.271Z",
								id: "resource2",
								resourceObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
									object: { type: "Note", content: "This is a simple resource 2" },
									published: "2015-01-25T12:34:56Z"
								}
							}
						]
					},
					{
						op: "add",
						path: "/edges",
						value: [
							{
								dateCreated: "2024-08-22T11:55:16.271Z",
								edgeObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
									object: { type: "Note", content: "This is a simple edge 1" },
									published: "2015-01-25T12:34:56Z"
								},
								edgeRelationship: "friend",
								id: "edge1"
							},
							{
								dateCreated: "2024-08-22T11:55:16.271Z",
								edgeObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
									object: { type: "Note", content: "This is a simple edge 2" },
									published: "2015-01-25T12:34:56Z"
								},
								edgeRelationship: "enemy",
								id: "edge2"
							}
						]
					}
				]
			}
		});

		immutableIntegrity = await decodeJwtToIntegrity(immutableStore[1].data);

		expect(immutableIntegrity).toEqual({
			dateCreated: "2024-08-22T11:56:56.272Z",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			hash: "ank774DVi2rngvo6+QjKeN9mghB5UC7pvWBbBwXuFUs=",
			signature:
				"pNpgeKqAmkLzvOpQcTb6Or9kPa+RasosaY0I/StCu3JhcmHqiSwA+GKIYgSR1A5IBEkthV1JHc1l7NbCsz86CA==",
			integrity: {
				patches: [
					{ op: "replace", path: "/vertexObject/object/content", value: "This is a simple note 2" },
					{ op: "add", path: "/aliases/0/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/aliases/0/aliasObject/object/content",
						value: "This is a simple note alias 10"
					},
					{ op: "add", path: "/aliases/1/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/aliases/1/aliasObject/object/content",
						value: "This is a simple note alias 20"
					},
					{ op: "add", path: "/resources/0/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/resources/0/resourceObject/object/content",
						value: "This is a simple note resource 10"
					},
					{ op: "add", path: "/resources/1/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/resources/1/resourceObject/object/content",
						value: "This is a simple note resource 20"
					},
					{ op: "add", path: "/edges/0/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/edges/0/edgeObject/object/content",
						value: "This is a simple note edge 10"
					},
					{ op: "add", path: "/edges/1/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/edges/1/edgeObject/object/content",
						value: "This is a simple note edge 20"
					}
				]
			}
		});
	});

	test("Can remove the immutable storage for a vertex", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
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

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toEqual({
			"@context": ["https://schema.twindev.org/aig/", "https://schema.org/"],
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			aliases: [
				{ id: "foo123", type: "AuditableItemGraphAlias", dateCreated: "2024-08-22T11:55:16.271Z" },
				{ id: "bar456", type: "AuditableItemGraphAlias", dateCreated: "2024-08-22T11:55:16.271Z" }
			],
			changesets: [
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:55:16.271Z",
					hash: "orN0KaNwyaMN/eNCasa5gVdxASLAboEUruNIjKjiVCk=",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{ id: "foo123", dateCreated: "2024-08-22T11:55:16.271Z" },
								{ id: "bar456", dateCreated: "2024-08-22T11:55:16.271Z" }
							]
						}
					],
					verification: {
						type: "AuditableItemGraphVerification",
						dateCreated: "2024-08-22T11:55:16.271Z",
						state: "ok"
					},
					signature:
						"/PSzLQIctmWsOnOy5sOVPS/+HuYxcylJHXm6g+yMOn6CBnjVQAiG1g3eQhnvZnd+/85w5Z35Ml592KTaGBqkAw==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true
		});

		expect(immutableStore.length).toEqual(0);
	});

	test("Can query for a vertex by id", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
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

		expect(results).toEqual({
			"@context": ["https://schema.twindev.org/aig/", "https://schema.org/"],
			type: "AuditableItemGraphVertexList",
			vertices: [
				{
					type: "AuditableItemGraphVertex",
					id: "0404040404040404040404040404040404040404040404040404040404040404",
					dateCreated: "2024-08-22T11:56:56.272Z",
					dateModified: "2024-08-22T11:56:56.272Z"
				},
				{
					type: "AuditableItemGraphVertex",
					id: "0101010101010101010101010101010101010101010101010101010101010101",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:55:16.271Z"
				}
			]
		});
	});

	test("Can query for a vertex by alias", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
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
		expect(results).toEqual({
			"@context": ["https://schema.twindev.org/aig/", "https://schema.org/"],
			type: "AuditableItemGraphVertexList",
			vertices: [
				{
					id: "0404040404040404040404040404040404040404040404040404040404040404",
					type: "AuditableItemGraphVertex",
					dateCreated: "2024-08-22T11:56:56.272Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					aliases: [
						{
							id: "foo456",
							type: "AuditableItemGraphAlias",
							dateCreated: "2024-08-22T11:56:56.272Z"
						},
						{
							id: "bar456",
							type: "AuditableItemGraphAlias",
							dateCreated: "2024-08-22T11:56:56.272Z"
						}
					]
				},
				{
					id: "0101010101010101010101010101010101010101010101010101010101010101",
					type: "AuditableItemGraphVertex",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:55:16.271Z",
					aliases: [
						{
							id: "foo123",
							type: "AuditableItemGraphAlias",
							dateCreated: "2024-08-22T11:55:16.271Z"
						},
						{
							id: "bar123",
							type: "AuditableItemGraphAlias",
							dateCreated: "2024-08-22T11:55:16.271Z"
						}
					]
				}
			]
		});
	});

	test("Can query for a vertex by id or alias", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
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
		expect(results).toEqual({
			"@context": ["https://schema.twindev.org/aig/", "https://schema.org/"],
			type: "AuditableItemGraphVertexList",
			vertices: [
				{
					id: "0404040404040404040404040404040404040404040404040404040404040404",
					type: "AuditableItemGraphVertex",
					dateCreated: "2024-08-22T11:56:56.272Z",
					dateModified: "2024-08-22T11:56:56.272Z"
				},
				{
					id: "0101010101010101010101010101010101010101010101010101010101010101",
					type: "AuditableItemGraphVertex",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:55:16.271Z",
					aliases: [
						{ id: "foo4", type: "AuditableItemGraphAlias", dateCreated: "2024-08-22T11:55:16.271Z" }
					]
				}
			]
		});
	});

	test("Can query for a vertex by mode id", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
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
		expect(results).toEqual({
			"@context": ["https://schema.twindev.org/aig/", "https://schema.org/"],
			type: "AuditableItemGraphVertexList",
			vertices: [
				{
					id: "0404040404040404040404040404040404040404040404040404040404040404",
					type: "AuditableItemGraphVertex",
					dateCreated: "2024-08-22T11:56:56.272Z",
					dateModified: "2024-08-22T11:56:56.272Z"
				}
			]
		});
	});

	test("Can query for a vertex by mode alias", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
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
		expect(results).toEqual({
			"@context": ["https://schema.twindev.org/aig/", "https://schema.org/"],
			type: "AuditableItemGraphVertexList",
			vertices: [
				{
					id: "0101010101010101010101010101010101010101010101010101010101010101",
					type: "AuditableItemGraphVertex",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:55:16.271Z",
					aliases: [
						{ id: "foo4", type: "AuditableItemGraphAlias", dateCreated: "2024-08-22T11:55:16.271Z" }
					]
				}
			]
		});
	});

	test("Can create a vertex with an object and a valid schema", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });

		const id = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: {
					id: "acct:person@example.org",
					type: "Person",
					name: "Person"
				},
				object: {
					type: "Note",
					content: "This is a simple note 2"
				},
				published: "2015-01-25T12:34:56Z"
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
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			nodeIdentity: TEST_NODE_IDENTITY,
			vertexObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
				object: { type: "Note", content: "This is a simple note 2" },
				published: "2015-01-25T12:34:56Z"
			}
		});

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			hash: "pG8ZHTKY7ifqlyeRGqYol8lN/0bH814H6A4syih2bOc=",
			signature:
				"oZynaO4RLFDSZqde5PtT2jvCQvcOyABgr1J4GQj3gxrDnWRwr4gRqvKZqNnIi95OhHQvX4dOfoHoDOV6p4JdCg==",
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/vertexObject",
					value: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note 2" },
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changeset.immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		const immutableIntegrity = await decodeJwtToIntegrity(immutableStore[0].data);
		expect(immutableIntegrity).toEqual({
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			hash: "pG8ZHTKY7ifqlyeRGqYol8lN/0bH814H6A4syih2bOc=",
			signature:
				"oZynaO4RLFDSZqde5PtT2jvCQvcOyABgr1J4GQj3gxrDnWRwr4gRqvKZqNnIi95OhHQvX4dOfoHoDOV6p4JdCg==",
			integrity: {
				patches: [
					{
						op: "add",
						path: "/vertexObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							type: "Create",
							actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
							object: { type: "Note", content: "This is a simple note 2" },
							published: "2015-01-25T12:34:56Z"
						}
					}
				]
			}
		});
	});
});
