// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { VerifyDepth } from "@twin.org/auditable-item-graph-models";
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
import { setupTestEnv, TEST_NODE_IDENTITY, TEST_USER_IDENTITY } from "./setupTestEnv";
import { AuditableItemGraphService } from "../src/auditableItemGraphService";
import type { AuditableItemGraphChangeset } from "../src/entities/auditableItemGraphChangeset";
import type { AuditableItemGraphVertex } from "../src/entities/auditableItemGraphVertex";
import { initSchema } from "../src/schema";

let vertexStorage: MemoryEntityStorageConnector<AuditableItemGraphVertex>;
let changesetStorage: MemoryEntityStorageConnector<AuditableItemGraphChangeset>;
let immutableProofStorage: MemoryEntityStorageConnector<ImmutableProof>;
let immutableStorage: MemoryEntityStorageConnector<ImmutableItem>;

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
		expect(immutableStore).toEqual([
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzIiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoiQllLNHJFcURjS3RHMFFLT1FQUHJ4eEdxZTRCL2xndXRkRnlyN0pmMld6dz0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6IjNHTU1raUNIaDl2VVNDdkNpTVFVSFAzOUNrbzQ3ZGdpdFlKTmpzZWRuTjlweUZBODFZU3ZhUUR6VnRIS3dxZFVrSlY0NWY0Nnh3cmJGdG9MWlVhdFR0S2siLCJ2ZXJpZmljYXRpb25NZXRob2QiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzI2ltbXV0YWJsZS1wcm9vZiJ9fQ=="
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "BYK4rEqDcKtG0QKOQPPrxxGqe4B/lgutdFyr7Jf2Wzw=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"3GMMkiCHh9vUSCvCiMQUHP39Cko47dgitYJNjsednN9pyFA81YSvaQDzVtHKwqdUkJV45f46xwrbFtoLZUatTtKk",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
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
		expect(immutableStore).toEqual([
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzIiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoiTkNpTXcxVzJDL3BLNk04YUJOY29yQlpFeTZqSS9yNmdsbU14dmMwUkRKWT0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6IjVFUlFZS2NGRmo4cU13WmN2ZVJTVEsyRjNYMkFnaHpjeHNSYVl5cWdTWmNDZ0dwM1hRanlxNEpGWnh1WmRONjdRRk1ZVDd3TnE5UWVXVTdyNW9LcVc0aUQiLCJ2ZXJpZmljYXRpb25NZXRob2QiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzI2ltbXV0YWJsZS1wcm9vZiJ9fQ=="
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "NCiMw1W2C/pK6M8aBNcorBZEy6jI/r6glmMxvc0RDJY=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"5ERQYKcFFj8qMwZcveRSTK2F3X2AghzcxsRaYyqgSZcCgGp3XQjyq4JFZxuZdN67QFMYT7wNq9QeWU7r5oKqW4iD",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
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
		expect(immutableStore).toEqual([
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzIiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoicW9OalRUU1NOZ2c2MDNqR2lqQkdUUHpLOXE1WHY0ZUZYTzNUL1FjWko4TT0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6IjI2ZmhZejh2eVdoSFNoOWl2eVpaUGE0TTZ2d0t5RnUxVzhqSm5vZ0ZhcXVXcDY1YTVYazc2TGdtWFp5QTduaGRaZWFINTdWNkNWNDY1Uk50cHBZTVU1WlkiLCJ2ZXJpZmljYXRpb25NZXRob2QiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzI2ltbXV0YWJsZS1wcm9vZiJ9fQ=="
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "qoNjTTSSNgg603jGijBGTPzK9q5Xv4eFXO3T/QcZJ8M=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"26fhYz8vyWhHSh9ivyZZPa4M6vwKyFu1W8jJnogFaquWp65a5Xk76LgmXZyA7nhdZeaH57V6CV465RNtppYMU5ZY",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
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
		expect(immutableStore).toEqual([
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzIiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoiOVZUSis4R0xmU21aN0crczMwTFJyU1JRMDJkcEc0MXlOV0ZuR3F2U1A0UT0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6Ilhkbm5ob3pnSzNaRjR1NFJSTjVTZkNuOEY4Ym9BVTlOcGNaNU5YMWpmOW9WM243N1hmUlp3VnVKdEIxNVJmZVEyTDN2eFpRdTVZaUFWNGl4OHNHbnlITSIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mIn19"
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "9VTJ+8GLfSmZ7G+s30LRrSRQ02dpG41yNWFnGqvSP4Q=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"XdnnhozgK3ZF4u4RRN5SfCn8F8boAU9NpcZ5NX1jf9oV3n77XfRZwVuJtB15RfeQ2L3vxZQu5YiAV4ix8sGnyHM",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
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
						failure: "notIssued",
						verified: false
					}
				}
			],
			verified: false
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
		expect(immutableStore).toEqual([
			{
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzIiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoibnhsY3hKTk15UTJSR1FCRUZJbnVEM2hPb0dNQnd3Y2x5aHlRaXBRZE9xYz0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6IjJreHNMeDZZM1NQVmpvYlpRY0paV3RyRnp0YkJUeHJ1OExYREFKWVBKUmJRaGZhWEFtc1huZlhHTlFrbURhYnZHaERtOHdWM2FVWGY0ZUxGcldjUHlYdjciLCJ2ZXJpZmljYXRpb25NZXRob2QiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzI2ltbXV0YWJsZS1wcm9vZiJ9fQ=="
			}
		]);

		const immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "nxlcxJNMyQ2RGQBEFInuD3hOoGMBwwclyhyQipQdOqc=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"2kxsLx6Y3SPVjobZQcJZWtrFztbBTxru8LXDAJYPJRbQhfaXAmsXnfXGNQkmDabvGhDm8wV3aUXf4eLFrWcPyXv7",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
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
					id: "0404040404040404040404040404040404040404040404040404040404040404",
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
						"immutable-proof:0505050505050505050505050505050505050505050505050505050505050505",
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
				id: "0404040404040404040404040404040404040404040404040404040404040404",
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
				proofId: "immutable-proof:0505050505050505050505050505050505050505050505050505050505050505"
			}
		]);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzIiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoibnhsY3hKTk15UTJSR1FCRUZJbnVEM2hPb0dNQnd3Y2x5aHlRaXBRZE9xYz0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6IjJreHNMeDZZM1NQVmpvYlpRY0paV3RyRnp0YkJUeHJ1OExYREFKWVBKUmJRaGZhWEFtc1huZlhHTlFrbURhYnZHaERtOHdWM2FVWGY0ZUxGcldjUHlYdjciLCJ2ZXJpZmljYXRpb25NZXRob2QiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzI2ltbXV0YWJsZS1wcm9vZiJ9fQ=="
			},
			{
				id: "0707070707070707070707070707070707070707070707070707070707070707",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1IiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoib0V4K3Bra2syL0FOSFN1UmpPZ3U4Nit6eDFxMGNUVStqOFJRaFVVdVZGRT0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6IjVOY2FXbzNrMjlBR0FxZEZZZER6bnQ2bVZ1MnhlNEJ1WlRFYWNwemdnYkxQbllnZldGUGhVc1FUWDhvdHlIRWpld3RhWFAxc0NoVnJkVU1LakxhZk5kWGEiLCJ2ZXJpZmljYXRpb25NZXRob2QiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzI2ltbXV0YWJsZS1wcm9vZiJ9fQ=="
			}
		]);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "nxlcxJNMyQ2RGQBEFInuD3hOoGMBwwclyhyQipQdOqc=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"2kxsLx6Y3SPVjobZQcJZWtrFztbBTxru8LXDAJYPJRbQhfaXAmsXnfXGNQkmDabvGhDm8wV3aUXf4eLFrWcPyXv7",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
			}
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0505050505050505050505050505050505050505050505050505050505050505",
			type: "ImmutableProof",
			proofObjectHash: "oEx+pkkk2/ANHSuRjOgu86+zx1q0cTU+j8RQhUUuVFE=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0404040404040404040404040404040404040404040404040404040404040404",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"5NcaWo3k29AGAqdFYdDznt6mVu2xe4BuZTEacpzggbLPnYgfWFPhUsQTX8otyHEjewtaXP1sChVrdUMKjLafNdXa",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
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
					id: "0404040404040404040404040404040404040404040404040404040404040404",
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					proofId:
						"immutable-proof:0505050505050505050505050505050505050505050505050505050505050505",
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
				id: "0404040404040404040404040404040404040404040404040404040404040404",
				vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
				dateCreated: "2024-08-22T11:56:56.272Z",
				userIdentity:
					"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
				patches: [
					{ op: "replace", path: "/vertexObject/object/content", value: "This is a simple note 2" }
				],
				proofId: "immutable-proof:0505050505050505050505050505050505050505050505050505050505050505"
			}
		]);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzIiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoibnhsY3hKTk15UTJSR1FCRUZJbnVEM2hPb0dNQnd3Y2x5aHlRaXBRZE9xYz0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6IjJreHNMeDZZM1NQVmpvYlpRY0paV3RyRnp0YkJUeHJ1OExYREFKWVBKUmJRaGZhWEFtc1huZlhHTlFrbURhYnZHaERtOHdWM2FVWGY0ZUxGcldjUHlYdjciLCJ2ZXJpZmljYXRpb25NZXRob2QiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzI2ltbXV0YWJsZS1wcm9vZiJ9fQ=="
			},
			{
				id: "0707070707070707070707070707070707070707070707070707070707070707",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1IiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoiakhQeHMrZFM4N3IwL2dDaVdLZ0FtUzlXU3h2OEJUbUhueTZNQ2VnbHRxVT0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6ImgxcUd1Y3haNmc5OVhxWVhObVZQRG9XRnpQeTdCTTFod0FoN1hGaGExaUFlcmpvSzZqNEJ4akJLQnNVdFhYbllmWTlzekxManhhc3hjdHpTR2lSWm5GZSIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplbnRpdHktc3RvcmFnZToweDYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjMjaW1tdXRhYmxlLXByb29mIn19"
			}
		]);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "nxlcxJNMyQ2RGQBEFInuD3hOoGMBwwclyhyQipQdOqc=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"2kxsLx6Y3SPVjobZQcJZWtrFztbBTxru8LXDAJYPJRbQhfaXAmsXnfXGNQkmDabvGhDm8wV3aUXf4eLFrWcPyXv7",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
			}
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0505050505050505050505050505050505050505050505050505050505050505",
			type: "ImmutableProof",
			proofObjectHash: "jHPxs+dS87r0/gCiWKgAmS9WSxv8BTmHny6MCegltqU=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0404040404040404040404040404040404040404040404040404040404040404",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"h1qGucxZ6g99XqYXNmVPDoWFzPy7BM1hwAh7XFha1iAerjoK6j4BxjBKBsUtXXnYfY9szLLjxasxctzSGiRZnFe",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
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
					id: "0404040404040404040404040404040404040404040404040404040404040404",
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					proofId:
						"immutable-proof:0505050505050505050505050505050505050505050505050505050505050505",
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
				id: "0404040404040404040404040404040404040404040404040404040404040404",
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
				proofId: "immutable-proof:0505050505050505050505050505050505050505050505050505050505050505"
			}
		]);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzIiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoicVdiMEJIMnFTMjlXRmRlQjFCdlNjeVZPallpcGlpVnIwVENkem83eFE5ST0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6IjNBdUN1VjhMTWR0QlF5ZDVVd3FSS1VCYVphVXd4bXBrVmVZR1I1U2lSakg2elZjb2FqREY0cGtNMXFjbXoxWG81TEt4Yk5uQnJnblZ5dFBjQXFOSGJQelMiLCJ2ZXJpZmljYXRpb25NZXRob2QiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzI2ltbXV0YWJsZS1wcm9vZiJ9fQ=="
			},
			{
				id: "0707070707070707070707070707070707070707070707070707070707070707",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1IiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoiZ3JPODR4SFFnaUM0RkdjL1k4RzVjdkUxajlYcnFhZEtyQUdhSEJ2QlRrcz0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6IjNkd2tNdkFXY1haYTh5c3JqNzJxRnZEb1JMZWQ0UlM1TjN0WnEyVXRhQXlNcVNIWmpLbTFINDZaaUFpWmhIZFprYXVnNnZ2YkFHblNnOHFMbm42WnAxOHgiLCJ2ZXJpZmljYXRpb25NZXRob2QiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzI2ltbXV0YWJsZS1wcm9vZiJ9fQ=="
			}
		]);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "qWb0BH2qS29WFdeB1BvScyVOjYipiiVr0TCdzo7xQ9I=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"3AuCuV8LMdtBQyd5UwqRKUBaZaUwxmpkVeYGR5SiRjH6zVcoajDF4pkM1qcmz1Xo5LKxbNnBrgnVytPcAqNHbPzS",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
			}
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0505050505050505050505050505050505050505050505050505050505050505",
			type: "ImmutableProof",
			proofObjectHash: "grO84xHQgiC4FGc/Y8G5cvE1j9XrqadKrAGaHBvBTks=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0404040404040404040404040404040404040404040404040404040404040404",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"3dwkMvAWcXZa8ysrj72qFvDoRLed4RS5N3tZq2UtaAyMqSHZjKm1H46ZiAiZhHdZkaug6vvbAGnSg8qLnn6Zp18x",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
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
					id: "0404040404040404040404040404040404040404040404040404040404040404",
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					proofId:
						"immutable-proof:0505050505050505050505050505050505050505050505050505050505050505",
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
				id: "0404040404040404040404040404040404040404040404040404040404040404",
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
				proofId: "immutable-proof:0505050505050505050505050505050505050505050505050505050505050505"
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
					id: "0404040404040404040404040404040404040404040404040404040404040404",
					type: "AuditableItemGraphChangeset",
					dateCreated: "2024-08-22T11:56:56.272Z",
					proofId:
						"immutable-proof:0505050505050505050505050505050505050505050505050505050505050505",
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
				id: "0404040404040404040404040404040404040404040404040404040404040404",
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
				proofId: "immutable-proof:0505050505050505050505050505050505050505050505050505050505050505"
			}
		]);

		const immutableStore = immutableStorage.getStore();
		expect(immutableStore).toEqual([
			{
				id: "0606060606060606060606060606060606060606060606060606060606060606",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzMDMwMzAzIiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoiNk9LeWZ4RER5Z1p5SDgyWklMcDBHQ0wyOXZlM2VuaTZmNXRGcGtyZS9Xaz0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIwMjAyMDIiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6IjRHVGZzU3FUa3hTa0hrZkFGc3o3dlJiMlZjTkxRamNnUmM4WGFkbWpWRVNTeWRFTEY3R05FbU1FdTRRZm1DTFVzUzRjVm9yYWNmb1VjbkVjTXdWOGE5NmciLCJ2ZXJpZmljYXRpb25NZXRob2QiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzI2ltbXV0YWJsZS1wcm9vZiJ9fQ=="
			},
			{
				id: "0707070707070707070707070707070707070707070707070707070707070707",
				controller:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
				data: "eyJAY29udGV4dCI6WyJodHRwczovL3NjaGVtYS50d2luZGV2Lm9yZy9pbW11dGFibGUtcHJvb2YvIiwiaHR0cHM6Ly9zY2hlbWEub3JnLyIsImh0dHBzOi8vdzNpZC5vcmcvc2VjdXJpdHkvZGF0YS1pbnRlZ3JpdHkvdjIiXSwiaWQiOiIwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1MDUwNTA1IiwidHlwZSI6IkltbXV0YWJsZVByb29mIiwicHJvb2ZPYmplY3RIYXNoIjoibnhUbzI0NE1wWjNXbWFjMEd0cDR1clpZSmcvOVU4Ympuc0FLeU9Bb3kwbz0iLCJwcm9vZk9iamVjdElkIjoiYWlnOjAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDEwMTAxMDE6Y2hhbmdlc2V0OjA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQwNDA0MDQiLCJ1c2VySWRlbnRpdHkiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4NTg1ODU4IiwicHJvb2YiOnsidHlwZSI6IkRhdGFJbnRlZ3JpdHlQcm9vZiIsImNyZWF0ZWQiOiIyMDI0LTA4LTIyVDExOjU2OjU2LjI3MloiLCJjcnlwdG9zdWl0ZSI6ImVkZHNhLWpjcy0yMDIyIiwicHJvb2ZQdXJwb3NlIjoiYXNzZXJ0aW9uTWV0aG9kIiwicHJvb2ZWYWx1ZSI6IjRCWGRwaWJxSHdpUnhZTnhmTmZNNnFla1Vzc1BjWkJlWFR0UnR3VWJlVHFyWUhRUExVaGVicUZqdWF4YW9ZS1daM2h1TmhQdW9qRVNQd3loeWFSMnBOQm8iLCJ2ZXJpZmljYXRpb25NZXRob2QiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzNjM2MzYzI2ltbXV0YWJsZS1wcm9vZiJ9fQ=="
			}
		]);

		let immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[0].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0303030303030303030303030303030303030303030303030303030303030303",
			type: "ImmutableProof",
			proofObjectHash: "6OKyfxDDygZyH82ZILp0GCL29ve3eni6f5tFpkre/Wk=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0202020202020202020202020202020202020202020202020202020202020202",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"4GTfsSqTkxSkHkfAFsz7vRb2VcNLQjcgRc8XadmjVESSydELF7GNEmMEu4QfmCLUsS4cVoracfoUcnEcMwV8a96g",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
			}
		});

		immutableProof = ObjectHelper.fromBytes<IImmutableProof>(
			Converter.base64ToBytes(immutableStore[1].data)
		);
		expect(immutableProof).toEqual({
			"@context": [
				"https://schema.twindev.org/immutable-proof/",
				"https://schema.org/",
				"https://w3id.org/security/data-integrity/v2"
			],
			id: "0505050505050505050505050505050505050505050505050505050505050505",
			type: "ImmutableProof",
			proofObjectHash: "nxTo244MpZ3Wmac0Gtp4urZYJg/9U8bjnsAKyOAoy0o=",
			proofObjectId:
				"aig:0101010101010101010101010101010101010101010101010101010101010101:changeset:0404040404040404040404040404040404040404040404040404040404040404",
			userIdentity:
				"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
			proof: {
				type: "DataIntegrityProof",
				created: "2024-08-22T11:56:56.272Z",
				cryptosuite: "eddsa-jcs-2022",
				proofPurpose: "assertionMethod",
				proofValue:
					"4BXdpibqHwiRxYNxfNfM6qekUssPcZBeXTtRtwUbeTqrYHQPLUhebqFjuaxaoYKWZ3huNhPuojESPwyhyaR2pNBo",
				verificationMethod:
					"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363#immutable-proof"
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
