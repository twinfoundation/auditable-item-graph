// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { VerifyDepth } from "@twin.org/auditable-item-graph-models";
import {
	type BackgroundTask,
	EntityStorageBackgroundTaskConnector,
	initSchema as initSchemaBackgroundTask
} from "@twin.org/background-task-connector-entity-storage";
import { BackgroundTaskConnectorFactory } from "@twin.org/background-task-models";
import { ComponentFactory, Converter, ObjectHelper, RandomHelper } from "@twin.org/core";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import type { IImmutableProof } from "@twin.org/immutable-proof-models";
import {
	type ImmutableProof,
	ImmutableProofService,
	initSchema as initSchemaImmutableProof
} from "@twin.org/immutable-proof-service";
import {
	EntityStorageImmutableStorageConnector,
	type ImmutableItem,
	initSchema as initSchemaImmutableStorage
} from "@twin.org/immutable-storage-connector-entity-storage";
import { ImmutableStorageConnectorFactory } from "@twin.org/immutable-storage-models";
import { nameof } from "@twin.org/nameof";
import {
	cleanupTestEnv,
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
let immutableProofStorage: MemoryEntityStorageConnector<ImmutableProof>;
let immutableStorage: MemoryEntityStorageConnector<ImmutableItem>;
let backgroundTaskStorage: MemoryEntityStorageConnector<BackgroundTask>;

const FIRST_TICK = 1724327716271;
const SECOND_TICK = 1724327816272;

/**
 * Wait for the proof to be generated.
 * @param proofCount The number of proofs to wait for.
 */
async function waitForProofGeneration(proofCount: number = 1): Promise<void> {
	let count = 0;
	do {
		await new Promise(resolve => setTimeout(resolve, 200));
	} while (immutableStorage.getStore().length < proofCount && count++ < proofCount * 40);
	if (count >= proofCount * 40) {
		// eslint-disable-next-line no-restricted-syntax
		throw new Error("Proof generation timed out");
	}
}

describe("AuditableItemGraphService", () => {
	beforeAll(async () => {
		await setupTestEnv();

		initSchema();
		initSchemaImmutableStorage();
		initSchemaImmutableProof();
		initSchemaBackgroundTask();
	});

	afterAll(async () => {
		await cleanupTestEnv();
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
			"immutable-storage",
			() => new EntityStorageImmutableStorageConnector()
		);

		immutableProofStorage = new MemoryEntityStorageConnector<ImmutableProof>({
			entitySchema: nameof<ImmutableProof>()
		});
		EntityStorageConnectorFactory.register("immutable-proof", () => immutableProofStorage);

		backgroundTaskStorage = new MemoryEntityStorageConnector<BackgroundTask>({
			entitySchema: nameof<BackgroundTask>()
		});
		EntityStorageConnectorFactory.register("background-task", () => backgroundTaskStorage);

		const backgroundTask = new EntityStorageBackgroundTaskConnector();
		BackgroundTaskConnectorFactory.register("background-task", () => backgroundTask);
		await backgroundTask.start(TEST_NODE_IDENTITY);

		const immutableProofService = new ImmutableProofService();
		ComponentFactory.register("immutable-proof", () => immutableProofService);

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
			.mockImplementationOnce(length => new Uint8Array(length).fill(5))
			.mockImplementationOnce(length => new Uint8Array(length).fill(6))
			.mockImplementationOnce(length => new Uint8Array(length).fill(7))
			.mockImplementationOnce(length => new Uint8Array(length).fill(8))
			.mockImplementationOnce(length => new Uint8Array(length).fill(9))
			.mockImplementationOnce(length => new Uint8Array(length).fill(10))
			.mockImplementation(length => new Uint8Array(length).fill(11));
	});

	test("Can create an instance", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		expect(service).toBeDefined();
	});

	test("Can create a vertex with no properties", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			undefined,
			undefined,
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		await waitForProofGeneration();

		const vertexStore = vertexStorage.getStore();
		const vertex = vertexStore[0];

		expect(vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			nodeIdentity: TEST_NODE_IDENTITY
		});

		const changesetStore = changesetStorage.getStore();
		expect(changesetStore).toEqual([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				userIdentity: TEST_USER_IDENTITY,
				patches: [],
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
			}
		]);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toMatchObject([
			{
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toMatchObject({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "JivCShtIyJ6WNpy7AsSZ0mwu84TZ6FljBFpzinTyo2A=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"4r7eyJcxvR32qhVZDqHtV1rhBGAtpDFWUJR4fh2FP1616Da2uBawdtCSfpKbsDAuYiZxgn8n2vBL3uNndJkqSCeL",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create a vertex with an alias", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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

		expect(changesetStore).toEqual([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
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
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
			}
		]);

		await waitForProofGeneration();

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toMatchObject([
			{
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toMatchObject({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "K+dsykb0u3/40N/Vhsu3cHxYU90hWZmkh/I5IVw4ymw=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"dyLzdxRDwb7pTVPnk5xGE1VvdVqhXkzf2ez9GTAvLbAM4UFDN3ja9xSXgNahBzWE3j5DQ2tTQtsUo22pR25J3S8",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create a vertex with object", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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

		expect(changesetStore).toEqual([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
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
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
			}
		]);

		await waitForProofGeneration();

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toMatchObject([
			{
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toMatchObject({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "L5BTYnOExVqifeARZB+puXEVw14dSSoslAG+Vv3BYeM=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"3uwDhqj7hwj1qF6w7FFrMyNftXj5QRWxegXDsmEX28mfcvFoeXWVJdRqZWEM8cabrCSLs2RPuHrQj4E2hVjQsAi2",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can get a vertex", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/"
			],
			type: "AuditableItemGraphVertex",
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
					type: "AuditableItemGraphAlias",
					id: "foo123",
					dateCreated: "2024-08-22T11:55:16.271Z"
				},
				{
					type: "AuditableItemGraphAlias",
					id: "bar456",
					dateCreated: "2024-08-22T11:55:16.271Z"
				}
			]
		});
	});

	test("Can get a vertex include changesets", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/"
			],
			type: "AuditableItemGraphVertex",
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
					type: "AuditableItemGraphAlias",
					id: "foo123",
					aliasFormat: "type1",
					dateCreated: "2024-08-22T11:55:16.271Z"
				},
				{
					type: "AuditableItemGraphAlias",
					id: "bar456",
					aliasFormat: "type2",
					dateCreated: "2024-08-22T11:55:16.271Z"
				}
			],
			changesets: [
				{
					id: "0202020202020202020202020202020202020202020202020202020202020202",
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:55:16.271Z",
					userIdentity: TEST_USER_IDENTITY,
					proofId:
						"immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
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
								{ id: "foo123", aliasFormat: "type1", dateCreated: "2024-08-22T11:55:16.271Z" },
								{ id: "bar456", aliasFormat: "type2", dateCreated: "2024-08-22T11:55:16.271Z" }
							]
						}
					]
				}
			]
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toEqual([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				userIdentity: TEST_USER_IDENTITY,
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
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
				]
			}
		]);

		await waitForProofGeneration();

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toMatchObject([
			{
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toMatchObject({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "egal2NStxgk8OwxLOwxLVF8zL+DYM+sVELYcBNG4wQw=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"5Zxj4REVPNtVe6ykAwKZBQpLXcFEbU3koGwKr1Awm85dQaPiRYJF676UwLDAGX3w2xEnZGasqx8FcHpkgDSgXxh1",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can get a vertex include changesets and verify current signature", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/"
			],
			type: "AuditableItemGraphVertex",
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
					id: "0202020202020202020202020202020202020202020202020202020202020202",
					dateCreated: "2024-08-22T11:55:16.271Z",
					userIdentity: TEST_USER_IDENTITY,
					proofId:
						"immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
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
						type: "ImmutableProofVerification",
						verified: true
					}
				}
			],
			verified: true
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toEqual([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
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
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
			}
		]);

		await waitForProofGeneration();

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toMatchObject([
			{
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toMatchObject({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "tM+POHEonArBnubRWqCtR5jaVstNNpeusrLcOwrLZJo=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"LvqwM5PnrNwmArKcpRVEBBY12PAU3GaKRioYpZA88tfVz5NfycBeLc3dDHVWawawt4rFoaoUPU3hxt7EnpjvGT2",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create and update with no changes and verify", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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

		await waitForProofGeneration();

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.Current
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/"
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
					id: "0202020202020202020202020202020202020202020202020202020202020202",
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:55:16.271Z",
					proofId:
						"immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
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
					verification: { type: "ImmutableProofVerification", verified: true },
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			vertexObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
				object: { type: "Note", content: "This is a simple note" },
				published: "2015-01-25T12:34:56Z"
			},
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toEqual([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
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
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
			}
		]);
	});

	test("Can create and update and verify aliases", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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

		await waitForProofGeneration(2);

		const result = await service.get(id, {
			includeChangesets: true,
			includeDeleted: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/"
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
					id: "0202020202020202020202020202020202020202020202020202020202020202",
					dateCreated: "2024-08-22T11:55:16.271Z",
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
					proofId:
						"immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
					verification: {
						type: "ImmutableProofVerification",
						verified: true
					}
				},
				{
					type: "AuditableItemGraphChangeset",
					id: "0606060606060606060606060606060606060606060606060606060606060606",
					dateCreated: "2024-08-22T11:56:56.272Z",
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
						type: "ImmutableProofVerification",
						verified: true
					},
					proofId:
						"immutable-proof:0707070707070707070707070707070707070707070707070707070707070707",
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
		expect(changesetStore).toEqual([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
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
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
			},
			{
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:56:56.272Z",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				patches: [
					{ op: "add", path: "/aliases/0/dateDeleted", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "add",
						path: "/aliases/-",
						value: { id: "foo321", dateCreated: "2024-08-22T11:56:56.272Z" }
					}
				],
				proofId: "immutable-proof:0707070707070707070707070707070707070707070707070707070707070707"
			}
		]);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toMatchObject([
			{
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			},
			{
				id: "0909090909090909090909090909090909090909090909090909090909090909",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			}
		]);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toMatchObject({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "tM+POHEonArBnubRWqCtR5jaVstNNpeusrLcOwrLZJo=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"LvqwM5PnrNwmArKcpRVEBBY12PAU3GaKRioYpZA88tfVz5NfycBeLc3dDHVWawawt4rFoaoUPU3hxt7EnpjvGT2",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toMatchObject({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0707070707070707070707070707070707070707070707070707070707070707",
			type: "ImmutableProof",
			proofObjectHash: "vABEtMiVQoBrRdt0pYPD6PS9VEuUglPgUJqGSgPswDY=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0606060606060606060606060606060606060606060606060606060606060606",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"59kNtasi6FNNJAQCB7oGL4TcbWN4jPU9U2Tk6yt5gX6y7LpJxH6ijhS8t5GdwAb7fagxXw1av6vxaPExcrrHbgDj",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create and update and verify aliases and object", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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

		await waitForProofGeneration(2);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/"
			],
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			aliases: [
				{ id: "foo123", type: "AuditableItemGraphAlias", dateCreated: "2024-08-22T11:55:16.271Z" },
				{ id: "bar456", type: "AuditableItemGraphAlias", dateCreated: "2024-08-22T11:55:16.271Z" }
			],
			changesets: [
				{
					id: "0202020202020202020202020202020202020202020202020202020202020202",
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:55:16.271Z",
					proofId:
						"immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
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
					verification: { type: "ImmutableProofVerification", verified: true },
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					id: "0606060606060606060606060606060606060606060606060606060606060606",
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					proofId:
						"immutable-proof:0707070707070707070707070707070707070707070707070707070707070707",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/vertexObject/object/content",
							patchValue: "This is a simple note 2"
						}
					],
					verification: { type: "ImmutableProofVerification", verified: true },
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			vertexObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
				object: { type: "Note", content: "This is a simple note 2" },
				published: "2015-01-25T12:34:56Z"
			},
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore).toEqual([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
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
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
			},
			{
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:56:56.272Z",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				patches: [
					{ op: "replace", path: "/vertexObject/object/content", value: "This is a simple note 2" }
				],
				proofId: "immutable-proof:0707070707070707070707070707070707070707070707070707070707070707"
			}
		]);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toMatchObject([
			{
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			},
			{
				id: "0909090909090909090909090909090909090909090909090909090909090909",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			}
		]);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toMatchObject({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "tM+POHEonArBnubRWqCtR5jaVstNNpeusrLcOwrLZJo=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"LvqwM5PnrNwmArKcpRVEBBY12PAU3GaKRioYpZA88tfVz5NfycBeLc3dDHVWawawt4rFoaoUPU3hxt7EnpjvGT2",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toMatchObject({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0707070707070707070707070707070707070707070707070707070707070707",
			type: "ImmutableProof",
			proofObjectHash: "ETwwuiu5kXy3vGJmIZGL9Ah0HhoDrg96AxXAJGFmS4Y=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0606060606060606060606060606060606060606060606060606060606060606",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"4938YvZ1Y3YRjvEsi4WeJjm3jWzZYVxWyNg1uzSeab1B7XgXuJNpPr1GCMuvh9p2L3YRkk9HR7kVoC17F5sFusHZ",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create and update and verify aliases and object", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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

		await waitForProofGeneration(2);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/"
			],
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			aliases: [
				{ id: "foo123", type: "AuditableItemGraphAlias", dateCreated: "2024-08-22T11:55:16.271Z" },
				{ id: "bar456", type: "AuditableItemGraphAlias", dateCreated: "2024-08-22T11:55:16.271Z" }
			],
			changesets: [
				{
					id: "0202020202020202020202020202020202020202020202020202020202020202",
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:55:16.271Z",
					proofId:
						"immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
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
										actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
										object: { type: "Note", content: "This is a simple note resource" },
										published: "2015-01-25T12:34:56Z"
									}
								},
								{
									id: "resource2",
									dateCreated: "2024-08-22T11:55:16.271Z",
									resourceObject: {
										"@context": "https://www.w3.org/ns/activitystreams",
										type: "Create",
										actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
										object: { type: "Note", content: "This is a simple note resource 2" },
										published: "2015-01-25T12:34:56Z"
									}
								}
							]
						}
					],
					verification: { type: "ImmutableProofVerification", verified: true },
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					id: "0606060606060606060606060606060606060606060606060606060606060606",
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					proofId:
						"immutable-proof:0707070707070707070707070707070707070707070707070707070707070707",
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
					verification: { type: "ImmutableProofVerification", verified: true },
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			resources: [
				{
					id: "resource1",
					type: "AuditableItemGraphResource",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					resourceObject: {
						"@context": "https://www.w3.org/ns/activitystreams",
						type: "Create",
						actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
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
						actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
						object: { type: "Note", content: "This is a simple note resource 11" },
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			vertexObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
				object: { type: "Note", content: "This is a simple note 2" },
				published: "2015-01-25T12:34:56Z"
			},
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true
		});

		const changesetStore = changesetStorage.getStore();
		expect(changesetStore).toEqual([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
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
									actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
									object: { type: "Note", content: "This is a simple note resource" },
									published: "2015-01-25T12:34:56Z"
								}
							},
							{
								id: "resource2",
								dateCreated: "2024-08-22T11:55:16.271Z",
								resourceObject: {
									"@context": "https://www.w3.org/ns/activitystreams",
									type: "Create",
									actor: { type: "Person", id: "acct:person@example.org", name: "Person" },
									object: { type: "Note", content: "This is a simple note resource 2" },
									published: "2015-01-25T12:34:56Z"
								}
							}
						]
					}
				],
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
			},
			{
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:56:56.272Z",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				patches: [
					{ op: "replace", path: "/vertexObject/object/content", value: "This is a simple note 2" },
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
						value: "This is a simple note resource 11"
					}
				],
				proofId: "immutable-proof:0707070707070707070707070707070707070707070707070707070707070707"
			}
		]);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toMatchObject([
			{
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			},
			{
				id: "0909090909090909090909090909090909090909090909090909090909090909",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			}
		]);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toMatchObject({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "d5Xueg5A5hOqQau7oKrWjPfrTtBVi04T84CyO/7rmpw=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"w9XUEiMosC6JmYyKz1vDSLtuWxeZuUHuzDvSsGGREo27DcpFUje2o6u7vS9cbpYiKdgemBN5zL4Yvhb8raVqKq4",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toMatchObject({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0707070707070707070707070707070707070707070707070707070707070707",
			type: "ImmutableProof",
			proofObjectHash: "eDfyxFd0tzL1kBKEith49Q1yzfgQvOF5bpbIr3/SZrw=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0606060606060606060606060606060606060606060606060606060606060606",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"2W7vqR43pu4frJqs26tK2tPvUTpRsRK4Mq6CUynNJqHW3TzpkDWSzBxoKU8emBTtJW2ntRjZVTx3KHSinpt8VLQo",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create and update and verify edges", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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

		await waitForProofGeneration(2);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/"
			],
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			changesets: [
				{
					id: "0202020202020202020202020202020202020202020202020202020202020202",
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:55:16.271Z",
					proofId:
						"immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
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
					verification: { type: "ImmutableProofVerification", verified: true },
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					id: "0606060606060606060606060606060606060606060606060606060606060606",
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					proofId:
						"immutable-proof:0707070707070707070707070707070707070707070707070707070707070707",
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
					verification: { type: "ImmutableProofVerification", verified: true },
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

		expect(changesetStore).toEqual([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
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
									actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
									object: { type: "Note", content: "This is a simple note" },
									published: "2015-01-25T12:34:56Z"
								},
								edgeRelationship: "friend"
							}
						]
					}
				],
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
			},
			{
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:56:56.272Z",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				patches: [
					{ op: "add", path: "/edges/0/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/edges/0/edgeObject/object/content",
						value: "This is a simple note 2"
					},
					{ op: "replace", path: "/edges/0/edgeRelationship", value: "frenemy" }
				],
				proofId: "immutable-proof:0707070707070707070707070707070707070707070707070707070707070707"
			}
		]);
	});

	test("Can create and update and verify aliases, object, resources and edges", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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

		await waitForProofGeneration(2);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/"
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
					id: "0202020202020202020202020202020202020202020202020202020202020202",
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:55:16.271Z",
					proofId:
						"immutable-proof:0303030303030303030303030303030303030303030303030303030303030303",
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
					verification: { type: "ImmutableProofVerification", verified: true },
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				},
				{
					id: "0606060606060606060606060606060606060606060606060606060606060606",
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					proofId:
						"immutable-proof:0707070707070707070707070707070707070707070707070707070707070707",
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
					verification: { type: "ImmutableProofVerification", verified: true },
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
			vertexObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
				object: { type: "Note", content: "This is a simple note 2" },
				published: "2015-01-25T12:34:56Z"
			},
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true
		});

		const changesetStore = changesetStorage.getStore();
		expect(changesetStore).toEqual([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
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
				proofId: "immutable-proof:0303030303030303030303030303030303030303030303030303030303030303"
			},
			{
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:56:56.272Z",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
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
				proofId: "immutable-proof:0707070707070707070707070707070707070707070707070707070707070707"
			}
		]);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toMatchObject([
			{
				id: "0505050505050505050505050505050505050505050505050505050505050505",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			},
			{
				id: "0909090909090909090909090909090909090909090909090909090909090909",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			}
		]);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toMatchObject({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "SRmgnhw42SxA29tj/cTxPqs3luRSj3b4RxjNY3mOQxI=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"2z8cPYNZqa9oYi2Gk6SCBoNu5aQZbNZzhzp6bydkoNz4prHaujk2mrk5E5QbdyDCMGezKZUKGU9kahiju5yAmSqy",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toMatchObject({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0707070707070707070707070707070707070707070707070707070707070707",
			type: "ImmutableProof",
			proofObjectHash: "HIBfa6oWsT0eeRkiPic4+ty+W+8cmPM0Im8FRMIEX/o=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0606060606060606060606060606060606060606060606060606060606060606",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"2VaePJ2tAVRQYpJC3WdF27bdvUNh64aAAGwRX937rhvUwPk7pCFuZGQR5bVxypm5EUmFquoConzbzKn6RVJm56LA",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can remove the immutable storage for a vertex", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			undefined,
			[{ id: "foo123" }, { id: "bar456" }],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await waitForProofGeneration();

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore.length).toEqual(1);

		await service.removeImmutable(id, TEST_NODE_IDENTITY);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/"
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
					id: "0202020202020202020202020202020202020202020202020202020202020202",
					dateCreated: "2024-08-22T11:55:16.271Z",
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
						type: "ImmutableProofVerification",
						verified: false,
						failure: "proofMissing"
					},
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: false
		});

		expect(immutableStore.length).toEqual(0);
	});

	test("Can query for a vertex by id", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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
					id: "0606060606060606060606060606060606060606060606060606060606060606",
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
		const service = new AuditableItemGraphService({ config: {} });
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
					id: "0606060606060606060606060606060606060606060606060606060606060606",
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
		const service = new AuditableItemGraphService({ config: {} });
		await service.create(
			undefined,
			[{ id: "foo6" }],
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

		const results = await service.query({ id: "6" });
		expect(results).toEqual({
			"@context": ["https://schema.twindev.org/aig/", "https://schema.org/"],
			type: "AuditableItemGraphVertexList",
			vertices: [
				{
					id: "0606060606060606060606060606060606060606060606060606060606060606",
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
						{ id: "foo6", type: "AuditableItemGraphAlias", dateCreated: "2024-08-22T11:55:16.271Z" }
					]
				}
			]
		});
	});

	test("Can query for a vertex by mode id", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		await service.create(
			undefined,
			[{ id: "foo6" }],
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

		const results = await service.query({ id: "6", idMode: "id" });
		expect(results).toEqual({
			"@context": ["https://schema.twindev.org/aig/", "https://schema.org/"],
			type: "AuditableItemGraphVertexList",
			vertices: [
				{
					id: "0606060606060606060606060606060606060606060606060606060606060606",
					type: "AuditableItemGraphVertex",
					dateCreated: "2024-08-22T11:56:56.272Z",
					dateModified: "2024-08-22T11:56:56.272Z"
				}
			]
		});
	});

	test("Can query for a vertex by using mode alias", async () => {
		const service = new AuditableItemGraphService({ config: {} });
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

		await waitForProofGeneration();

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
});
