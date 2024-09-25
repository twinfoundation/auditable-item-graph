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
				"@type": "Create",
				actor: {
					"@type": "Person",
					"@id": "acct:person@example.org",
					name: "Person"
				},
				object: {
					"@type": "Note",
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
				"@type": "Create",
				actor: {
					"@type": "Person",
					"@id": "acct:person@example.org",
					name: "Person"
				},
				object: {
					"@type": "Note",
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
						"@type": "Create",
						actor: {
							"@type": "Person",
							"@id": "acct:person@example.org",
							name: "Person"
						},
						object: {
							"@type": "Note",
							content: "This is a simple note"
						},
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			hash: "wEBP4FkJ2I6MdhRPiD2xP38ONGj9NWuNvDEx/kxLZzY=",
			signature:
				"hzFrZIDKZhq+oLhCPSNR5bD85cy66S/Dt/gjwLb2hn+3mX5ehjq6KtJWwZmXCBMIdKSSy7Vl+Ant8zPN3rKgCw==",
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
			hash: "wEBP4FkJ2I6MdhRPiD2xP38ONGj9NWuNvDEx/kxLZzY=",
			signature:
				"hzFrZIDKZhq+oLhCPSNR5bD85cy66S/Dt/gjwLb2hn+3mX5ehjq6KtJWwZmXCBMIdKSSy7Vl+Ant8zPN3rKgCw==",
			integrity: {
				patches: [
					{
						op: "add",
						path: "/vertexObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Create",
							actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
							object: { "@type": "Note", content: "This is a simple note" },
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
				"@type": "Create",
				actor: {
					"@type": "Person",
					"@id": "acct:person@example.org",
					name: "Person"
				},
				object: {
					"@type": "Note",
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
			"@context": [
				AuditableItemGraphTypes.ContextRoot,
				SchemaOrgTypes.ContextRoot,
				"https://www.w3.org/ns/activitystreams"
			],
			type: AuditableItemGraphTypes.Vertex,
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			nodeIdentity: TEST_NODE_IDENTITY,
			vertexObject: {
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
				"@type": "Create",
				actor: {
					"@type": "Person",
					"@id": "acct:person@example.org",
					name: "Person"
				},
				object: {
					"@type": "Note",
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
			"@context": [
				AuditableItemGraphTypes.ContextRoot,
				SchemaOrgTypes.ContextRoot,
				"https://www.w3.org/ns/activitystreams"
			],
			type: AuditableItemGraphTypes.Vertex,
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			nodeIdentity: TEST_NODE_IDENTITY,
			vertexObject: {
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
					hash: "qWUiywE1B5T6Dbxoiv9tyXg/LuPBS/b8rOdWhd6tEF0=",
					signature:
						"MNknwnf0eAPgEBnf8Vvr4qetOZc9Ph0fwu9uYa/eno7Uy76p9ED1zif6ns+VwOEga9M+2MKn+oy91ljZR/0nAQ==",
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
								"@type": "Create",
								actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
								object: { "@type": "Note", content: "This is a simple note" },
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
			hash: "qWUiywE1B5T6Dbxoiv9tyXg/LuPBS/b8rOdWhd6tEF0=",
			signature:
				"MNknwnf0eAPgEBnf8Vvr4qetOZc9Ph0fwu9uYa/eno7Uy76p9ED1zif6ns+VwOEga9M+2MKn+oy91ljZR/0nAQ==",
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/vertexObject",
					value: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
						object: { "@type": "Note", content: "This is a simple note" },
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
				"@type": "Create",
				actor: {
					"@type": "Person",
					"@id": "acct:person@example.org",
					name: "Person"
				},
				object: {
					"@type": "Note",
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
			"@context": [
				AuditableItemGraphTypes.ContextRoot,
				SchemaOrgTypes.ContextRoot,
				"https://www.w3.org/ns/activitystreams"
			],
			type: AuditableItemGraphTypes.Vertex,
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			nodeIdentity: TEST_NODE_IDENTITY,
			vertexObject: {
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
					hash: "EmCKQAzmyva/WWsQIBJYFbOVscKptvUnPVOLglAiMgE=",
					signature:
						"AF2GQ45Zz8kbdsQJlE1tmGdmcRG9Cxx/OmI9+gcduAjWNqdr3FO2Km15o5ujaX1rErX1fXsmb9dCQKto5bDUBQ==",
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
								"@type": "Create",
								actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
								object: { "@type": "Note", content: "This is a simple note" },
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
					]
				}
			],
			verified: true,
			changesetsVerification: [
				{
					type: "AuditableItemGraphVerification",
					state: "ok",
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
					path: "/vertexObject",
					value: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: {
							"@type": "Person",
							"@id": "acct:person@example.org",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
			hash: "EmCKQAzmyva/WWsQIBJYFbOVscKptvUnPVOLglAiMgE=",
			signature:
				"AF2GQ45Zz8kbdsQJlE1tmGdmcRG9Cxx/OmI9+gcduAjWNqdr3FO2Km15o5ujaX1rErX1fXsmb9dCQKto5bDUBQ==",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});
	});

	test("Can create and update with no changes and verify", async () => {
		const service = new AuditableItemGraphService({ config: { enableImmutableDiffs: true } });
		const id = await service.create(
			{
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Create",
				actor: {
					"@type": "Person",
					"@id": "acct:person@example.org",
					name: "Person"
				},
				object: {
					"@type": "Note",
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
				"@type": "Create",
				actor: {
					"@type": "Person",
					"@id": "acct:person@example.org",
					name: "Person"
				},
				object: {
					"@type": "Note",
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
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.org/",
				"https://www.w3.org/ns/activitystreams"
			],
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
					hash: "EmCKQAzmyva/WWsQIBJYFbOVscKptvUnPVOLglAiMgE=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/vertexObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
								object: { "@type": "Note", content: "This is a simple note" },
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
					signature:
						"AF2GQ45Zz8kbdsQJlE1tmGdmcRG9Cxx/OmI9+gcduAjWNqdr3FO2Km15o5ujaX1rErX1fXsmb9dCQKto5bDUBQ==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			changesetsVerification: [
				{
					type: "AuditableItemGraphVerification",
					dateCreated: "2024-08-22T11:55:16.271Z",
					state: "ok"
				}
			],
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true,
			vertexObject: {
				type: "Create",
				actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
				object: { type: "Note", content: "This is a simple note" },
				published: "2015-01-25T12:34:56Z"
			}
		});

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			hash: "EmCKQAzmyva/WWsQIBJYFbOVscKptvUnPVOLglAiMgE=",
			signature:
				"AF2GQ45Zz8kbdsQJlE1tmGdmcRG9Cxx/OmI9+gcduAjWNqdr3FO2Km15o5ujaX1rErX1fXsmb9dCQKto5bDUBQ==",
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
						"@type": "Create",
						actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
						object: { "@type": "Note", content: "This is a simple note" },
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
				"@type": "Create",
				actor: {
					"@type": "Person",
					"@id": "acct:person@example.org",
					name: "Person"
				},
				object: {
					"@type": "Note",
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
				"@type": "Create",
				actor: {
					"@type": "Person",
					"@id": "acct:person@example.org",
					name: "Person"
				},
				object: {
					"@type": "Note",
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
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.org/",
				"https://www.w3.org/ns/activitystreams"
			],
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
					hash: "EmCKQAzmyva/WWsQIBJYFbOVscKptvUnPVOLglAiMgE=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/vertexObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
								object: { "@type": "Note", content: "This is a simple note" },
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
					signature:
						"AF2GQ45Zz8kbdsQJlE1tmGdmcRG9Cxx/OmI9+gcduAjWNqdr3FO2Km15o5ujaX1rErX1fXsmb9dCQKto5bDUBQ==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					hash: "26iW3Ft5v2WE2Wy24JSC2vCqshTU9FVESMj6tJ/Y8Hg=",
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
					signature:
						"F9OqIVVmUmPQTT63k4IDLjIPO+uFRIJ/+f1biRN1m0dP6SnN+kYADvhyh73gmms/CVfJxw14HfcEmow7dHfcCQ==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			changesetsVerification: [
				{
					type: "AuditableItemGraphVerification",
					dateCreated: "2024-08-22T11:55:16.271Z",
					state: "ok"
				},
				{
					type: "AuditableItemGraphVerification",
					dateCreated: "2024-08-22T11:56:56.272Z",
					state: "ok"
				}
			],
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true,
			vertexObject: {
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
						"@type": "Create",
						actor: {
							"@type": "Person",
							"@id": "acct:person@example.org",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
			hash: "EmCKQAzmyva/WWsQIBJYFbOVscKptvUnPVOLglAiMgE=",
			signature:
				"AF2GQ45Zz8kbdsQJlE1tmGdmcRG9Cxx/OmI9+gcduAjWNqdr3FO2Km15o5ujaX1rErX1fXsmb9dCQKto5bDUBQ==",
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
			hash: "26iW3Ft5v2WE2Wy24JSC2vCqshTU9FVESMj6tJ/Y8Hg=",
			signature:
				"F9OqIVVmUmPQTT63k4IDLjIPO+uFRIJ/+f1biRN1m0dP6SnN+kYADvhyh73gmms/CVfJxw14HfcEmow7dHfcCQ==",
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
			hash: "EmCKQAzmyva/WWsQIBJYFbOVscKptvUnPVOLglAiMgE=",
			signature:
				"AF2GQ45Zz8kbdsQJlE1tmGdmcRG9Cxx/OmI9+gcduAjWNqdr3FO2Km15o5ujaX1rErX1fXsmb9dCQKto5bDUBQ==",
			integrity: {
				patches: [
					{
						op: "add",
						path: "/vertexObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Create",
							actor: {
								"@id": "acct:person@example.org",
								"@type": "Person",
								name: "Person"
							},
							object: {
								"@type": "Note",
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
			hash: "26iW3Ft5v2WE2Wy24JSC2vCqshTU9FVESMj6tJ/Y8Hg=",
			signature:
				"F9OqIVVmUmPQTT63k4IDLjIPO+uFRIJ/+f1biRN1m0dP6SnN+kYADvhyh73gmms/CVfJxw14HfcEmow7dHfcCQ==",
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
				"@type": "Create",
				actor: {
					"@type": "Person",
					"@id": "acct:person@example.org",
					name: "Person"
				},
				object: {
					"@type": "Note",
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
				"@type": "Create",
				actor: {
					"@type": "Person",
					"@id": "acct:person@example.org",
					name: "Person"
				},
				object: {
					"@type": "Note",
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
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.org/",
				"https://www.w3.org/ns/activitystreams"
			],
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
					hash: "EmCKQAzmyva/WWsQIBJYFbOVscKptvUnPVOLglAiMgE=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/vertexObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: {
									"@type": "Person",
									"@id": "acct:person@example.org",
									name: "Person"
								},
								object: {
									"@type": "Note",
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
					signature:
						"AF2GQ45Zz8kbdsQJlE1tmGdmcRG9Cxx/OmI9+gcduAjWNqdr3FO2Km15o5ujaX1rErX1fXsmb9dCQKto5bDUBQ==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					hash: "6BCo+A3a6R1OhFpkxXoOIL9sCnmg902ldjh/pmOHMw8=",
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
					signature:
						"pm9EFgtyOMfQQRiHIfZDm5Vr27AYEQOz6BDFFArwl75PYbPjGuYexORTMh7neCM6Wl7tzznjPkZkWmxQgx0MDA==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			changesetsVerification: [
				{
					type: "AuditableItemGraphVerification",
					dateCreated: "2024-08-22T11:55:16.271Z",
					state: "ok"
				},
				{
					type: "AuditableItemGraphVerification",
					dateCreated: "2024-08-22T11:56:56.272Z",
					state: "ok"
				}
			],
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true,
			vertexObject: {
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
						"@type": "Create",
						actor: {
							"@type": "Person",
							"@id": "acct:person@example.org",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
			hash: "EmCKQAzmyva/WWsQIBJYFbOVscKptvUnPVOLglAiMgE=",
			signature:
				"AF2GQ45Zz8kbdsQJlE1tmGdmcRG9Cxx/OmI9+gcduAjWNqdr3FO2Km15o5ujaX1rErX1fXsmb9dCQKto5bDUBQ==",
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
			hash: "6BCo+A3a6R1OhFpkxXoOIL9sCnmg902ldjh/pmOHMw8=",
			signature:
				"pm9EFgtyOMfQQRiHIfZDm5Vr27AYEQOz6BDFFArwl75PYbPjGuYexORTMh7neCM6Wl7tzznjPkZkWmxQgx0MDA==",
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
			hash: "EmCKQAzmyva/WWsQIBJYFbOVscKptvUnPVOLglAiMgE=",
			signature:
				"AF2GQ45Zz8kbdsQJlE1tmGdmcRG9Cxx/OmI9+gcduAjWNqdr3FO2Km15o5ujaX1rErX1fXsmb9dCQKto5bDUBQ==",
			integrity: {
				patches: [
					{
						op: "add",
						path: "/vertexObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Create",
							actor: {
								"@id": "acct:person@example.org",
								"@type": "Person",
								name: "Person"
							},
							object: {
								"@type": "Note",
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
				"@type": "Create",
				actor: {
					"@type": "Person",
					"@id": "acct:person@example.org",
					name: "Person"
				},
				object: {
					"@type": "Note",
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
						"@type": "Create",
						actor: {
							"@type": "Person",
							"@id": "acct:person@example.org",
							name: "Person"
						},
						object: {
							"@type": "Note",
							content: "This is a simple note resource"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "resource2",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: {
							"@type": "Person",
							"@id": "acct:person@example.org",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
				"@type": "Create",
				actor: {
					"@type": "Person",
					"@id": "acct:person@example.org",
					name: "Person"
				},
				object: {
					"@type": "Note",
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
						"@type": "Create",
						actor: {
							"@type": "Person",
							"@id": "acct:person@example.org",
							name: "Person"
						},
						object: {
							"@type": "Note",
							content: "This is a simple note resource 10"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "resource2",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: {
							"@type": "Person",
							"@id": "acct:person@example.org",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.org/",
				"https://www.w3.org/ns/activitystreams"
			],
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
					hash: "Hv748kaW/EVY3QuF5zxdi/4VAkUUk5U2BHGeD63CKm8=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/vertexObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: {
									"@type": "Person",
									"@id": "acct:person@example.org",
									name: "Person"
								},
								object: {
									"@type": "Note",
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
										"@type": "Create",
										actor: {
											"@type": "Person",
											"@id": "acct:person@example.org",
											name: "Person"
										},
										object: {
											"@type": "Note",
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
										"@type": "Create",
										actor: {
											"@type": "Person",
											"@id": "acct:person@example.org",
											name: "Person"
										},
										object: {
											"@type": "Note",
											content: "This is a simple note resource 2"
										},
										published: "2015-01-25T12:34:56Z"
									}
								}
							]
						}
					],
					signature:
						"19NArjoMrT+cMO7b45DyUBnm3bA1C5amxYHu1D4qX1zqva5lBqUTixtsGkIXtqiG4vh6E2+2VexGswWSiRwyDw==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					hash: "+UC7WV6Br1LkX2oL9QkXbLlB47vWLhFu3IHH0Zu+Ybo=",
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
					signature:
						"fa18gqnSJlw5bPdCAqRxnvw3o2O1xlXVvDyOX0uxYXapAvzUrsyiOwc0VMeR6gVBm0Mu/6Y47cKlaThgnf7BBw==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			changesetsVerification: [
				{
					type: "AuditableItemGraphVerification",
					dateCreated: "2024-08-22T11:55:16.271Z",
					state: "ok"
				},
				{
					type: "AuditableItemGraphVerification",
					dateCreated: "2024-08-22T11:56:56.272Z",
					state: "ok"
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
					type: "AuditableItemGraphResource",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					resourceObject: {
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
						"@type": "Create",
						actor: {
							"@type": "Person",
							"@id": "acct:person@example.org",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
								"@type": "Create",
								actor: {
									"@type": "Person",
									"@id": "acct:person@example.org",
									name: "Person"
								},
								object: {
									"@type": "Note",
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
								"@type": "Create",
								actor: {
									"@type": "Person",
									"@id": "acct:person@example.org",
									name: "Person"
								},
								object: {
									"@type": "Note",
									content: "This is a simple note resource 2"
								},
								published: "2015-01-25T12:34:56Z"
							}
						}
					]
				}
			],
			hash: "Hv748kaW/EVY3QuF5zxdi/4VAkUUk5U2BHGeD63CKm8=",
			signature:
				"19NArjoMrT+cMO7b45DyUBnm3bA1C5amxYHu1D4qX1zqva5lBqUTixtsGkIXtqiG4vh6E2+2VexGswWSiRwyDw==",
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
			hash: "+UC7WV6Br1LkX2oL9QkXbLlB47vWLhFu3IHH0Zu+Ybo=",
			signature:
				"fa18gqnSJlw5bPdCAqRxnvw3o2O1xlXVvDyOX0uxYXapAvzUrsyiOwc0VMeR6gVBm0Mu/6Y47cKlaThgnf7BBw==",
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
			hash: "Hv748kaW/EVY3QuF5zxdi/4VAkUUk5U2BHGeD63CKm8=",
			signature:
				"19NArjoMrT+cMO7b45DyUBnm3bA1C5amxYHu1D4qX1zqva5lBqUTixtsGkIXtqiG4vh6E2+2VexGswWSiRwyDw==",
			integrity: {
				patches: [
					{
						op: "add",
						path: "/vertexObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Create",
							actor: {
								"@id": "acct:person@example.org",
								"@type": "Person",
								name: "Person"
							},
							object: {
								"@type": "Note",
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
									"@type": "Create",
									actor: {
										"@id": "acct:person@example.org",
										"@type": "Person",
										name: "Person"
									},
									object: {
										"@type": "Note",
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
									"@type": "Create",
									actor: {
										"@id": "acct:person@example.org",
										"@type": "Person",
										name: "Person"
									},
									object: {
										"@type": "Note",
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
			hash: "+UC7WV6Br1LkX2oL9QkXbLlB47vWLhFu3IHH0Zu+Ybo=",
			signature:
				"fa18gqnSJlw5bPdCAqRxnvw3o2O1xlXVvDyOX0uxYXapAvzUrsyiOwc0VMeR6gVBm0Mu/6Y47cKlaThgnf7BBw==",
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
						"@type": "Create",
						actor: {
							"@id": "acct:person@example.org",
							"@type": "Person",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
						"@type": "Create",
						actor: {
							"@id": "acct:person@example.org",
							"@type": "Person",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.org/",
				"https://www.w3.org/ns/activitystreams"
			],
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			changesets: [
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:55:16.271Z",
					hash: "sOrnVuZYfyU3rKgZcnU6pTb5iOR7pNdJkPX5NIjh+jw=",
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
									"@type": "Create",
									actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
									object: { "@type": "Note", content: "This is a simple note" },
									published: "2015-01-25T12:34:56Z"
								},
								edgeRelationship: "friend"
							}
						}
					],
					signature:
						"RQ+LD5ts30gGfDRB+z36uCwaS8xYmac6p6Uz2i3+P83zvRsz+Rcj7k6iZZrj+8V2WJ8b1nwah5o4OhfGJBvzBw==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					hash: "HNBBORsq/qTRTZpblLg8Qss9cRImhE5tFQTbx+E1YVQ=",
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
					signature:
						"iiDUQ7myX0PsfU4lWVndCcP0jpBvVlvvbPTyyl3FIweKAd8efW6JMPRGHRBHYz20omaVExoiz1KMRZbKHCmUCg==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			changesetsVerification: [
				{
					type: "AuditableItemGraphVerification",
					dateCreated: "2024-08-22T11:55:16.271Z",
					state: "ok"
				},
				{
					type: "AuditableItemGraphVerification",
					dateCreated: "2024-08-22T11:56:56.272Z",
					state: "ok"
				}
			],
			edges: [
				{
					id: "edge1",
					type: "AuditableItemGraphEdge",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					edgeObject: {
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
			hash: "sOrnVuZYfyU3rKgZcnU6pTb5iOR7pNdJkPX5NIjh+jw=",
			signature:
				"RQ+LD5ts30gGfDRB+z36uCwaS8xYmac6p6Uz2i3+P83zvRsz+Rcj7k6iZZrj+8V2WJ8b1nwah5o4OhfGJBvzBw==",
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
								"@type": "Create",
								actor: {
									"@id": "acct:person@example.org",
									"@type": "Person",
									name: "Person"
								},
								object: {
									"@type": "Note",
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
			hash: "HNBBORsq/qTRTZpblLg8Qss9cRImhE5tFQTbx+E1YVQ=",
			signature:
				"iiDUQ7myX0PsfU4lWVndCcP0jpBvVlvvbPTyyl3FIweKAd8efW6JMPRGHRBHYz20omaVExoiz1KMRZbKHCmUCg==",
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
				"@type": "Create",
				actor: {
					"@id": "acct:person@example.org",
					"@type": "Person",
					name: "Person"
				},
				object: {
					"@type": "Note",
					content: "This is a simple note"
				},
				published: "2015-01-25T12:34:56Z"
			},
			[
				{
					id: "foo123",
					aliasObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: {
							"@id": "acct:person@example.org",
							"@type": "Person",
							name: "Person"
						},
						object: {
							"@type": "Note",
							content: "This is a simple alias 1"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "bar456",
					aliasObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: {
							"@id": "acct:person@example.org",
							"@type": "Person",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
						"@type": "Create",
						actor: {
							"@id": "acct:person@example.org",
							"@type": "Person",
							name: "Person"
						},
						object: {
							"@type": "Note",
							content: "This is a simple note resource 1"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "resource2",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: {
							"@id": "acct:person@example.org",
							"@type": "Person",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
						"@type": "Create",
						actor: {
							"@id": "acct:person@example.org",
							"@type": "Person",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
						"@type": "Create",
						actor: {
							"@id": "acct:person@example.org",
							"@type": "Person",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
				"@type": "Create",
				actor: {
					"@id": "acct:person@example.org",
					"@type": "Person",
					name: "Person"
				},
				object: {
					"@type": "Note",
					content: "This is a simple note 2"
				},
				published: "2015-01-25T12:34:56Z"
			},
			[
				{
					id: "foo123",
					aliasObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: {
							"@id": "acct:person@example.org",
							"@type": "Person",
							name: "Person"
						},
						object: {
							"@type": "Note",
							content: "This is a simple note alias 10"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "bar456",
					aliasObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: {
							"@id": "acct:person@example.org",
							"@type": "Person",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
						"@type": "Create",
						actor: {
							"@id": "acct:person@example.org",
							"@type": "Person",
							name: "Person"
						},
						object: {
							"@type": "Note",
							content: "This is a simple note resource 10"
						},
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "resource2",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: {
							"@id": "acct:person@example.org",
							"@type": "Person",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
						"@type": "Create",
						actor: {
							"@id": "acct:person@example.org",
							"@type": "Person",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
						"@type": "Create",
						actor: {
							"@id": "acct:person@example.org",
							"@type": "Person",
							name: "Person"
						},
						object: {
							"@type": "Note",
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
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.org/",
				"https://www.w3.org/ns/activitystreams"
			],
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
					hash: "tojDV5vHjU23J48xDwRERjzmtFXGuAoSsPIsA1jyhC4=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "add",
							patchPath: "/vertexObject",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple note" },
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
										"@type": "Create",
										actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
										object: { "@type": "Note", content: "This is a simple alias 1" },
										published: "2015-01-25T12:34:56Z"
									}
								},
								{
									id: "bar456",
									dateCreated: "2024-08-22T11:55:16.271Z",
									aliasObject: {
										"@context": "https://www.w3.org/ns/activitystreams",
										"@type": "Create",
										actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
										object: { "@type": "Note", content: "This is a simple note alias 2" },
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
										"@type": "Create",
										actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
										object: { "@type": "Note", content: "This is a simple note resource 1" },
										published: "2015-01-25T12:34:56Z"
									}
								},
								{
									id: "resource2",
									dateCreated: "2024-08-22T11:55:16.271Z",
									resourceObject: {
										"@context": "https://www.w3.org/ns/activitystreams",
										"@type": "Create",
										actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
										object: { "@type": "Note", content: "This is a simple resource 2" },
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
										"@type": "Create",
										actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
										object: { "@type": "Note", content: "This is a simple edge 1" },
										published: "2015-01-25T12:34:56Z"
									},
									edgeRelationship: "friend"
								},
								{
									id: "edge2",
									dateCreated: "2024-08-22T11:55:16.271Z",
									edgeObject: {
										"@context": "https://www.w3.org/ns/activitystreams",
										"@type": "Create",
										actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
										object: { "@type": "Note", content: "This is a simple edge 2" },
										published: "2015-01-25T12:34:56Z"
									},
									edgeRelationship: "enemy"
								}
							]
						}
					],
					signature:
						"ZWQO4BUOfAXhNDXYS55uRJEMjHXdHnAniaCY6dx7oIiC0dPR5z3Y90Y/peiVmUf5JeFvCuh2JybQtWwVhl3LDA==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					hash: "RPFzQTVqnF6xlgtHzvx4a5kyxwm+8m7pPt0jnWnf4W0=",
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
					signature:
						"SSZvRpIbydDRt3evoi+tZ+8QVfxiAuNirOb1+Shu64Fn3NVVNtlgwrpxWfSCRUgAmSpUVCaHtYnVL6tBcb2NDA==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			changesetsVerification: [
				{
					type: "AuditableItemGraphVerification",
					dateCreated: "2024-08-22T11:55:16.271Z",
					state: "ok"
				},
				{
					type: "AuditableItemGraphVerification",
					dateCreated: "2024-08-22T11:56:56.272Z",
					state: "ok"
				}
			],
			edges: [
				{
					id: "edge1",
					type: "AuditableItemGraphEdge",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					edgeObject: {
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
						type: "Create",
						actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
						object: { type: "Note", content: "This is a simple note resource 20" },
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			verified: true,
			vertexObject: {
				type: "Create",
				actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
				object: { type: "Note", content: "This is a simple note 2" },
				published: "2015-01-25T12:34:56Z"
			}
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			hash: "tojDV5vHjU23J48xDwRERjzmtFXGuAoSsPIsA1jyhC4=",
			signature:
				"ZWQO4BUOfAXhNDXYS55uRJEMjHXdHnAniaCY6dx7oIiC0dPR5z3Y90Y/peiVmUf5JeFvCuh2JybQtWwVhl3LDA==",
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/vertexObject",
					value: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
						object: { "@type": "Note", content: "This is a simple note" },
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
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple alias 1" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							id: "bar456",
							dateCreated: "2024-08-22T11:55:16.271Z",
							aliasObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple note alias 2" },
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
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple note resource 1" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							id: "resource2",
							dateCreated: "2024-08-22T11:55:16.271Z",
							resourceObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple resource 2" },
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
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple edge 1" },
								published: "2015-01-25T12:34:56Z"
							},
							edgeRelationship: "friend"
						},
						{
							id: "edge2",
							dateCreated: "2024-08-22T11:55:16.271Z",
							edgeObject: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple edge 2" },
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
			hash: "RPFzQTVqnF6xlgtHzvx4a5kyxwm+8m7pPt0jnWnf4W0=",
			signature:
				"SSZvRpIbydDRt3evoi+tZ+8QVfxiAuNirOb1+Shu64Fn3NVVNtlgwrpxWfSCRUgAmSpUVCaHtYnVL6tBcb2NDA==",
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
			hash: "tojDV5vHjU23J48xDwRERjzmtFXGuAoSsPIsA1jyhC4=",
			signature:
				"ZWQO4BUOfAXhNDXYS55uRJEMjHXdHnAniaCY6dx7oIiC0dPR5z3Y90Y/peiVmUf5JeFvCuh2JybQtWwVhl3LDA==",
			integrity: {
				patches: [
					{
						op: "add",
						path: "/vertexObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Create",
							actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
							object: { "@type": "Note", content: "This is a simple note" },
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
									"@type": "Create",
									actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
									object: { "@type": "Note", content: "This is a simple alias 1" },
									published: "2015-01-25T12:34:56Z"
								},
								dateCreated: "2024-08-22T11:55:16.271Z",
								id: "foo123"
							},
							{
								aliasObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									"@type": "Create",
									actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
									object: { "@type": "Note", content: "This is a simple note alias 2" },
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
									"@type": "Create",
									actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
									object: { "@type": "Note", content: "This is a simple note resource 1" },
									published: "2015-01-25T12:34:56Z"
								}
							},
							{
								dateCreated: "2024-08-22T11:55:16.271Z",
								id: "resource2",
								resourceObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									"@type": "Create",
									actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
									object: { "@type": "Note", content: "This is a simple resource 2" },
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
									"@type": "Create",
									actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
									object: { "@type": "Note", content: "This is a simple edge 1" },
									published: "2015-01-25T12:34:56Z"
								},
								edgeRelationship: "friend",
								id: "edge1"
							},
							{
								dateCreated: "2024-08-22T11:55:16.271Z",
								edgeObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									"@type": "Create",
									actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
									object: { "@type": "Note", content: "This is a simple edge 2" },
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
			hash: "RPFzQTVqnF6xlgtHzvx4a5kyxwm+8m7pPt0jnWnf4W0=",
			signature:
				"SSZvRpIbydDRt3evoi+tZ+8QVfxiAuNirOb1+Shu64Fn3NVVNtlgwrpxWfSCRUgAmSpUVCaHtYnVL6tBcb2NDA==",
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
					signature:
						"/PSzLQIctmWsOnOy5sOVPS/+HuYxcylJHXm6g+yMOn6CBnjVQAiG1g3eQhnvZnd+/85w5Z35Ml592KTaGBqkAw==",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			changesetsVerification: [
				{
					type: "AuditableItemGraphVerification",
					dateCreated: "2024-08-22T11:55:16.271Z",
					state: "ok"
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
				"@type": "Create",
				actor: {
					"@id": "acct:person@example.org",
					"@type": "Person",
					name: "Person"
				},
				object: {
					"@type": "Note",
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
				"@type": "Create",
				actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
				object: { "@type": "Note", content: "This is a simple note 2" },
				published: "2015-01-25T12:34:56Z"
			}
		});

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			hash: "2JyaH11cx1Q/OAn4UfKxx4xOAn5MLoTKlbhmALSjJMo=",
			signature:
				"bJmUAWhXtlb/awI5eVV7z59MrNetpfZpsud8a5dijLiZUCanAN3/0qMQ5dufa1RypG3bnQEBUWh4f6nthh03DQ==",
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/vertexObject",
					value: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
						object: { "@type": "Note", content: "This is a simple note 2" },
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
			hash: "2JyaH11cx1Q/OAn4UfKxx4xOAn5MLoTKlbhmALSjJMo=",
			signature:
				"bJmUAWhXtlb/awI5eVV7z59MrNetpfZpsud8a5dijLiZUCanAN3/0qMQ5dufa1RypG3bnQEBUWh4f6nthh03DQ==",
			integrity: {
				patches: [
					{
						op: "add",
						path: "/vertexObject",
						value: {
							"@context": "https://www.w3.org/ns/activitystreams",
							"@type": "Create",
							actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
							object: { "@type": "Note", content: "This is a simple note 2" },
							published: "2015-01-25T12:34:56Z"
						}
					}
				]
			}
		});
	});
});
