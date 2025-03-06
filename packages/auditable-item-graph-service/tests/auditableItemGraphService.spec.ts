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
import { ModuleHelper } from "@twin.org/modules";
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

		// Mock the module helper to execute the method in the same thread, so we don't have to create an engine
		ModuleHelper.execModuleMethodThread = vi
			.fn()
			.mockImplementation(async (module, method, args) =>
				ModuleHelper.execModuleMethod(module, method, args)
			);
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
		const id = await service.create({}, TEST_USER_IDENTITY, TEST_NODE_IDENTITY);
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
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:VPsHqgigEIPtBZmXKsCegSd8+nDilQq8go9+LkdYduc=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z3Vcuh2BP9ShC4UEJ3yRZgcTJ6gmRtydDrh6AmY1zEciQqEWTvXfBZNxxjTzdJjT44cmn9VDWbBHqxFsX9fjsfXzK",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create a vertex with an alias", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
				aliases: [{ id: "foo123" }, { id: "bar456" }]
			},
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
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:jKUvHHZ9kpNC5ufgYpDV5f1tjkz/JDlLCmou/x99XPo=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z36h2kQu8EXzMYSWtkZgvcVjYeuRTm79Yr9dPzVG8jASNcjFXQheTe6GTGbgoa3qPhneYr9GBXhdArjpF5eC7vptU",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create a vertex with object", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
				annotationObject: {
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
			annotationObject: {
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
						path: "/annotationObject",
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
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:RsaJ2Rz9CCk++m5DVMeu+hj3nlw4160HjHlySNzQoro=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"zfpKdFqWRps8ZtrJLZDF8AcgVvC7vHUvk2A5hUJn1pa2UX2RaFUG8GvJJ2uEdrpBqwMDuewfocqGNbom9w2xfRrA",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can get a vertex", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
				annotationObject: {
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
				aliases: [{ id: "foo123" }, { id: "bar456" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const result = await service.get(id);

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org"
			],
			type: "AuditableItemGraphVertex",
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			nodeIdentity: TEST_NODE_IDENTITY,
			annotationObject: {
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
				annotationObject: {
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
					{ id: "foo123", aliasFormat: "type1" },
					{ id: "bar456", aliasFormat: "type2" }
				]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const result = await service.get(id, { includeChangesets: true });

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			type: "AuditableItemGraphVertex",
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			nodeIdentity: TEST_NODE_IDENTITY,
			annotationObject: {
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
							patchPath: "/annotationObject",
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
						path: "/annotationObject",
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
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:gzqEabyev+HBwDTx4lDsvdtsTo3fr29ZwqSwpWfR1lg=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z9PjsoAebKoMuY8dzzrigbguxNVii8qmXm2FBm9XJKbjQqErSGqdMhfRi6ag98R3R2rEMfXuF2Y3vhAj4ueg2k4Q",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can get a vertex include changesets and verify current signature", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
				annotationObject: {
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
				aliases: [{ id: "foo123" }, { id: "bar456" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		expect(id.startsWith("aig:")).toEqual(true);

		await waitForProofGeneration();

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.Current
		});

		expect(result).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			type: "AuditableItemGraphVertex",
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:55:16.271Z",
			nodeIdentity: TEST_NODE_IDENTITY,
			annotationObject: {
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
							patchPath: "/annotationObject",
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
						path: "/annotationObject",
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
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:qexHFOvtq+O7X9p/073R4Nac6l8EfHuZLQ1zDgt/WQA=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z3B3ibaXsdYkY9ATiVF6AFBtVKvV3zKdj4dpwaHp1h3XhqjCk2pUFjTL4RsFeGGBkHBgZudXaYkFfe5h3e5V4kmTE",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create and update with no changes and verify", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
				annotationObject: {
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
				aliases: [{ id: "foo123" }, { id: "bar456" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			{
				id,
				annotationObject: {
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
				aliases: [{ id: "foo123" }, { id: "bar456" }]
			},
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
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
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
							patchPath: "/annotationObject",
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
			annotationObject: {
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
						path: "/annotationObject",
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
				annotationObject: {
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
				aliases: [{ id: "foo123" }, { id: "bar456" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			{
				id,
				annotationObject: {
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
				aliases: [{ id: "foo321" }, { id: "bar456" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await waitForProofGeneration(2);

		const result = await service.get(id, {
			includeChangesets: true,
			includeDeleted: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toMatchObject({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
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
							patchPath: "/annotationObject",
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
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			verified: true,
			annotationObject: {
				"@context": "https://www.w3.org/ns/activitystreams",
				type: "Create",
				actor: { id: "acct:person@example.org", type: "Person", name: "Person" },
				object: { type: "Note", content: "This is a simple note" },
				published: "2015-01-25T12:34:56Z"
			}
		});

		const changesetStore = changesetStorage.getStore();
		expect(changesetStore).toMatchObject([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				patches: [
					{
						op: "add",
						path: "/annotationObject",
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
				]
			}
		]);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toMatchObject([
			{
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			},
			{
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
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:qexHFOvtq+O7X9p/073R4Nac6l8EfHuZLQ1zDgt/WQA=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z3B3ibaXsdYkY9ATiVF6AFBtVKvV3zKdj4dpwaHp1h3XhqjCk2pUFjTL4RsFeGGBkHBgZudXaYkFfe5h3e5V4kmTE",
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
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			type: "ImmutableProof",
			proofObjectHash: "sha256:0jEEy9KV4/E3OpdfGI5o0PvXG4cijtMTex2uGPyL6bg=",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z4poHio4SKuVx8PT49proW5tUaMHgAX7eebwszxVqVKkn6MWVzz9FtZYFru8wGYbUNuNUJ6Z2s2qC4mjPHdJ7Wag4",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create and update and verify aliases and object", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
				annotationObject: {
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
				aliases: [{ id: "foo123" }, { id: "bar456" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			{
				id,
				annotationObject: {
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
				aliases: [{ id: "foo123" }, { id: "bar456" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await waitForProofGeneration(2);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toMatchObject({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
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
							patchPath: "/annotationObject",
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
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/annotationObject/object/content",
							patchValue: "This is a simple note 2"
						}
					],
					verification: { type: "ImmutableProofVerification", verified: true },
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858"
				}
			],
			annotationObject: {
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

		expect(changesetStore).toMatchObject([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				patches: [
					{
						op: "add",
						path: "/annotationObject",
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
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:56:56.272Z",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				patches: [
					{
						op: "replace",
						path: "/annotationObject/object/content",
						value: "This is a simple note 2"
					}
				]
			}
		]);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toMatchObject([
			{
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			},
			{
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
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:qexHFOvtq+O7X9p/073R4Nac6l8EfHuZLQ1zDgt/WQA=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z3B3ibaXsdYkY9ATiVF6AFBtVKvV3zKdj4dpwaHp1h3XhqjCk2pUFjTL4RsFeGGBkHBgZudXaYkFfe5h3e5V4kmTE",
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
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			type: "ImmutableProof",
			proofObjectHash: "sha256:Ib+Ku9nMWbHkXoh1laoNmf0KPVxvJfpn/0fHsNhaLdA=",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z4gtm399Ntvq2MzSu7xQh2Y2Jr1z1cJaZahvpGV6U2ht7ngpPzYGtSuzjniKPvDcF529Z3fuubAZPkWeuoqLwyeSp",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create and update and verify aliases and object", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
				annotationObject: {
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
				aliases: [{ id: "foo123" }, { id: "bar456" }],
				resources: [
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
				]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			{
				id,
				annotationObject: {
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
				aliases: [{ id: "foo123" }, { id: "bar456" }],
				resources: [
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
				]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await waitForProofGeneration(2);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toMatchObject({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
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
							patchPath: "/annotationObject",
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
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/annotationObject/object/content",
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
			annotationObject: {
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
		expect(changesetStore).toMatchObject([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				patches: [
					{
						op: "add",
						path: "/annotationObject",
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
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:56:56.272Z",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				patches: [
					{
						op: "replace",
						path: "/annotationObject/object/content",
						value: "This is a simple note 2"
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
						value: "This is a simple note resource 11"
					}
				]
			}
		]);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toMatchObject([
			{
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			},
			{
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
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:gz7dLiGwPZCpPmquOrBQy47bNpPWd8TIwg+bwhX7rEg=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"zoZx3LWaDJTnbeMjFFF1NYLhJQzcwQyKcKdwUxJn6DLA8YfSBJD7AMo8spLG6SJVsbgpqeg1oVfdLWjfDP2CmM3U",
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
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			type: "ImmutableProof",
			proofObjectHash: "sha256:TrY9E2Kr+SYrcEpSZzR3ZEh4TpQRK29NNoNOkrlQMuo=",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z591VqHL1GGGAxVth1qTwRkNFESpB8MzcTiwQ2LquUh49fP8tqWYATS46TgiXpsktvhY479axMNc2A9CCWc4YAJdC",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can create and update and verify edges", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
				edges: [
					{
						id: "edge1",
						edgeRelationship: "friend",
						annotationObject: {
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
				]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			{
				id,
				edges: [
					{
						id: "edge1",
						edgeRelationship: "frenemy",
						annotationObject: {
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
				]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await waitForProofGeneration(2);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toMatchObject({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
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
								annotationObject: {
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
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
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
							patchPath: "/edges/0/annotationObject/object/content",
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
					annotationObject: {
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

		expect(changesetStore).toMatchObject([
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
								annotationObject: {
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
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:56:56.272Z",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				patches: [
					{ op: "add", path: "/edges/0/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/edges/0/annotationObject/object/content",
						value: "This is a simple note 2"
					},
					{ op: "replace", path: "/edges/0/edgeRelationship", value: "frenemy" }
				]
			}
		]);
	});

	test("Can create and update and verify aliases, object, resources and edges", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
				annotationObject: {
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
				aliases: [
					{
						id: "foo123",
						annotationObject: {
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
						annotationObject: {
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
				resources: [
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
				edges: [
					{
						id: "edge1",
						edgeRelationship: "friend",
						annotationObject: {
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
						annotationObject: {
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
				]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await service.update(
			{
				id,
				annotationObject: {
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
				aliases: [
					{
						id: "foo123",
						annotationObject: {
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
						annotationObject: {
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
				resources: [
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
				edges: [
					{
						id: "edge1",
						edgeRelationship: "friend",
						annotationObject: {
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
						annotationObject: {
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
				]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		await waitForProofGeneration(2);

		const result = await service.get(id, {
			includeChangesets: true,
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toMatchObject({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
			type: "AuditableItemGraphVertex",
			dateCreated: "2024-08-22T11:55:16.271Z",
			dateModified: "2024-08-22T11:56:56.272Z",
			aliases: [
				{
					id: "foo123",
					type: "AuditableItemGraphAlias",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:56:56.272Z",
					annotationObject: {
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
					annotationObject: {
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
							patchPath: "/annotationObject",
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
									annotationObject: {
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
									annotationObject: {
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
									annotationObject: {
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
									annotationObject: {
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
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					patches: [
						{
							type: "AuditableItemGraphPatchOperation",
							patchOperation: "replace",
							patchPath: "/annotationObject/object/content",
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
							patchPath: "/aliases/0/annotationObject/object/content",
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
							patchPath: "/aliases/1/annotationObject/object/content",
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
							patchPath: "/edges/0/annotationObject/object/content",
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
							patchPath: "/edges/1/annotationObject/object/content",
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
					annotationObject: {
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
					annotationObject: {
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
			annotationObject: {
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
		expect(changesetStore).toMatchObject([
			{
				id: "0202020202020202020202020202020202020202020202020202020202020202",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:55:16.271Z",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				patches: [
					{
						op: "add",
						path: "/annotationObject",
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
								annotationObject: {
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
								annotationObject: {
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
								annotationObject: {
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
								annotationObject: {
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
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:56:56.272Z",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				patches: [
					{
						op: "replace",
						path: "/annotationObject/object/content",
						value: "This is a simple note 2"
					},
					{ op: "add", path: "/aliases/0/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/aliases/0/annotationObject/object/content",
						value: "This is a simple note alias 10"
					},
					{ op: "add", path: "/aliases/1/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/aliases/1/annotationObject/object/content",
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
						path: "/edges/0/annotationObject/object/content",
						value: "This is a simple note edge 10"
					},
					{ op: "add", path: "/edges/1/dateModified", value: "2024-08-22T11:56:56.272Z" },
					{
						op: "replace",
						path: "/edges/1/annotationObject/object/content",
						value: "This is a simple note edge 20"
					}
				]
			}
		]);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toMatchObject([
			{
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363"
			},
			{
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
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "sha256:zu9n3x5vQtD445LYA/w8Rf9QL7v6u3WCWXfS14EpI4k=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z2skXKosKpZz5T2TtcTa12tvZwrsoMSsFMWrTrKagdrDmecB28QbAimbsvpPkwiMYVEvL8yyy4MyQxDNpX8vg77JS",
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
				"https://schema.twindev.org/common/",
				"https://www.w3.org/ns/credentials/v2"
			],
			type: "ImmutableProof",
			proofObjectHash: "sha256:nbAKN2Rxdk1NfKl77bQIn9ht4zoPT0HyEtsoVHTaI6o=",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"z4JVRFoxtWmkRs1XTP6orRsP2Pdwub3BJxHuakzBc6VS5m1uAG7xXf1AznJz7NAR97BSXFpqE5p1maktHgFJWNzBF",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof-assertion"
			}
		});
	});

	test("Can remove the immutable storage for a vertex", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		const id = await service.create(
			{
				aliases: [{ id: "foo123" }, { id: "bar456" }]
			},
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
				"https://schema.twindev.org/common/",
				"https://schema.org",
				"https://schema.twindev.org/immutable-proof/"
			],
			id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
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
		await service.create({}, TEST_USER_IDENTITY, TEST_NODE_IDENTITY);
		await service.create({}, TEST_USER_IDENTITY, TEST_NODE_IDENTITY);

		const results = await service.query({ id: "0" });

		expect(results).toMatchObject({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org"
			],
			type: "AuditableItemGraphVertexList",
			vertices: [
				{
					type: "AuditableItemGraphVertex",
					dateCreated: "2024-08-22T11:56:56.272Z",
					dateModified: "2024-08-22T11:56:56.272Z"
				},
				{
					type: "AuditableItemGraphVertex",
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:55:16.271Z"
				}
			]
		});
	});

	test("Can query for a vertex by alias", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		await service.create(
			{
				aliases: [{ id: "foo123" }, { id: "bar123" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create(
			{
				aliases: [{ id: "foo456" }, { id: "bar456" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);

		const results = await service.query({ id: "foo" });
		expect(results).toMatchObject({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org"
			],
			type: "AuditableItemGraphVertexList",
			vertices: [
				{
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
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
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
			{
				aliases: [{ id: "foo5" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create({}, TEST_USER_IDENTITY, TEST_NODE_IDENTITY);

		const results = await service.query({ id: "5" });
		expect(results).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org"
			],
			type: "AuditableItemGraphVertexList",
			vertices: [
				{
					id: "aig:0505050505050505050505050505050505050505050505050505050505050505",
					type: "AuditableItemGraphVertex",
					dateCreated: "2024-08-22T11:56:56.272Z",
					dateModified: "2024-08-22T11:56:56.272Z"
				},
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
					type: "AuditableItemGraphVertex",
					dateCreated: "2024-08-22T11:55:16.271Z",
					dateModified: "2024-08-22T11:55:16.271Z",
					aliases: [
						{ id: "foo5", type: "AuditableItemGraphAlias", dateCreated: "2024-08-22T11:55:16.271Z" }
					]
				}
			]
		});
	});

	test("Can query for a vertex by mode id", async () => {
		const service = new AuditableItemGraphService({ config: {} });
		await service.create(
			{
				aliases: [{ id: "foo6" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create({}, TEST_USER_IDENTITY, TEST_NODE_IDENTITY);

		const results = await service.query({ id: "5", idMode: "id" });
		expect(results).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org"
			],
			type: "AuditableItemGraphVertexList",
			vertices: [
				{
					id: "aig:0505050505050505050505050505050505050505050505050505050505050505",
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
			{
				aliases: [{ id: "foo4" }]
			},
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create({}, TEST_USER_IDENTITY, TEST_NODE_IDENTITY);

		await waitForProofGeneration();

		const results = await service.query({ id: "4", idMode: "alias" });
		expect(results).toEqual({
			"@context": [
				"https://schema.twindev.org/aig/",
				"https://schema.twindev.org/common/",
				"https://schema.org"
			],
			type: "AuditableItemGraphVertexList",
			vertices: [
				{
					id: "aig:0101010101010101010101010101010101010101010101010101010101010101",
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
