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
			signature:
				"khjWjRusY7cpGQb93waFkgUpzfsI1ynoCVc8JB/jqkxHnSKmPdheW9pDkGkslrVsbE5dGdpwD3wOfemSp8n8Dw==",
			hash: "5/QKaqyMYylY+/GwpcSHopUw9tSeIK3tYSNNoMuYwjw=",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changeset.immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		const immutableIntegrity = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(immutableIntegrity.signature).toEqual(
			"khjWjRusY7cpGQb93waFkgUpzfsI1ynoCVc8JB/jqkxHnSKmPdheW9pDkGkslrVsbE5dGdpwD3wOfemSp8n8Dw=="
		);
		expect(immutableIntegrity.userIdentity).toEqual(TEST_USER_IDENTITY);
		expect(immutableIntegrity.integrity.patches).toEqual([]);
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
			signature:
				"Upe1JYPqtP0FQ56xYwB5WFlR3CsyQKke55KTRmn0/waQm6/OWCz+HJlfDYR4EuMthR8NHAixrl2iweYLHZ1xAg==",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changeset.immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		const immutableIntegrity = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(immutableIntegrity.signature).toEqual(
			"Upe1JYPqtP0FQ56xYwB5WFlR3CsyQKke55KTRmn0/waQm6/OWCz+HJlfDYR4EuMthR8NHAixrl2iweYLHZ1xAg=="
		);
		expect(immutableIntegrity.created).toEqual(FIRST_TICK);
		expect(immutableIntegrity.userIdentity).toEqual(TEST_USER_IDENTITY);

		expect(immutableIntegrity.integrity).toEqual({
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
			]
		});
	});

	test("Can create a vertex with some metadata", async () => {
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
			created: FIRST_TICK,
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: {
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
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/metadata",
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
			hash: "a6YPG/e5uPE5UujQHMUFBWDRS9hquN0zMx4NYbgFLJU=",
			signature:
				"OS1vlNYFDDFm37RQMH0PcLkcCepVgMnb2/8HBdGSyvJkzaIk3acuqoguFi6ByizCduVV7tK4QJ8jNQSJzC4nAw==",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changeset.immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		const immutableIntegrity = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(immutableIntegrity.signature).toEqual(
			"OS1vlNYFDDFm37RQMH0PcLkcCepVgMnb2/8HBdGSyvJkzaIk3acuqoguFi6ByizCduVV7tK4QJ8jNQSJzC4nAw=="
		);
		expect(immutableIntegrity.created).toEqual(FIRST_TICK);
		expect(immutableIntegrity.userIdentity).toEqual(TEST_USER_IDENTITY);
		expect(immutableIntegrity.integrity).toEqual({
			patches: [
				{
					op: "add",
					path: "/metadata",
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
			]
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
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: {
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
				{ id: "foo123", format: "type1" },
				{ id: "bar456", format: "type2" }
			],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		expect(id.startsWith("aig:")).toEqual(true);

		const result = await service.get(id, { includeChangesets: true });

		expect(result).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Create",
				actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
				object: { "@type": "Note", content: "This is a simple note" },
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ id: "foo123", format: "type1", created: FIRST_TICK },
				{ id: "bar456", format: "type2", created: FIRST_TICK }
			],
			changesets: [
				{
					hash: "NstRDrU726YzvJPr4+xOjyAlcnOEOFKR/+bCWntHbOQ=",
					signature:
						"sgAI1NMU7HrzyqnT7FSdGAfEVAzLTSDmH93UHU118xhIK+K+7nlqXpw3igGCifQl7XLdiYHqpCQN2Go0qlGDCg==",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{
							op: "add",
							path: "/metadata",
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
								{ id: "foo123", format: "type1", created: FIRST_TICK },
								{ id: "bar456", format: "type2", created: FIRST_TICK }
							]
						}
					]
				}
			]
		});

		const changesetStore = changesetStorage.getStore();
		const changeset = changesetStore[0];

		expect(changeset).toEqual({
			hash: "NstRDrU726YzvJPr4+xOjyAlcnOEOFKR/+bCWntHbOQ=",
			signature:
				"sgAI1NMU7HrzyqnT7FSdGAfEVAzLTSDmH93UHU118xhIK+K+7nlqXpw3igGCifQl7XLdiYHqpCQN2Go0qlGDCg==",
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/metadata",
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
						{ id: "foo123", format: "type1", created: FIRST_TICK },
						{ id: "bar456", format: "type2", created: FIRST_TICK }
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
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Create",
				actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
				object: { "@type": "Note", content: "This is a simple note" },
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ id: "foo123", created: FIRST_TICK },
				{ id: "bar456", created: FIRST_TICK }
			],
			changesets: [
				{
					hash: "0VMHDaEAIuetBJi6nlnUAbqsWnFPmeSxC9+0fAu42pA=",
					signature:
						"/e90MHyLbkkvPvcG3HhjVo4rN/O+x3FcgRZZ2Q79vjoHFqFw1MntrolcCsDPvPuY7SABxrxrHBPYPbVaG8plBA==",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{
							op: "add",
							path: "/metadata",
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
								{ id: "foo123", created: FIRST_TICK },
								{ id: "bar456", created: FIRST_TICK }
							]
						}
					]
				}
			],
			verified: true,
			verification: [{ created: FIRST_TICK }]
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
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				}
			],
			hash: "0VMHDaEAIuetBJi6nlnUAbqsWnFPmeSxC9+0fAu42pA=",
			signature:
				"/e90MHyLbkkvPvcG3HhjVo4rN/O+x3FcgRZZ2Q79vjoHFqFw1MntrolcCsDPvPuY7SABxrxrHBPYPbVaG8plBA==",
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
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Create",
				actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
				object: { "@type": "Note", content: "This is a simple note" },
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ id: "foo123", created: FIRST_TICK },
				{ id: "bar456", created: FIRST_TICK }
			],
			changesets: [
				{
					hash: "0VMHDaEAIuetBJi6nlnUAbqsWnFPmeSxC9+0fAu42pA=",
					signature:
						"/e90MHyLbkkvPvcG3HhjVo4rN/O+x3FcgRZZ2Q79vjoHFqFw1MntrolcCsDPvPuY7SABxrxrHBPYPbVaG8plBA==",
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{
							op: "add",
							path: "/metadata",
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
								{ id: "foo123", created: FIRST_TICK },
								{ id: "bar456", created: FIRST_TICK }
							]
						}
					],
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				}
			],
			verified: true,
			verification: [{ created: FIRST_TICK }]
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
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				}
			],
			hash: "0VMHDaEAIuetBJi6nlnUAbqsWnFPmeSxC9+0fAu42pA=",
			signature:
				"/e90MHyLbkkvPvcG3HhjVo4rN/O+x3FcgRZZ2Q79vjoHFqFw1MntrolcCsDPvPuY7SABxrxrHBPYPbVaG8plBA==",
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
			verifySignatureDepth: VerifyDepth.All
		});

		expect(result).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: SECOND_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Create",
				actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
				object: { "@type": "Note", content: "This is a simple note" },
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ id: "bar456", created: FIRST_TICK },
				{ id: "foo321", created: SECOND_TICK }
			],
			changesets: [
				{
					hash: "0VMHDaEAIuetBJi6nlnUAbqsWnFPmeSxC9+0fAu42pA=",
					signature:
						"/e90MHyLbkkvPvcG3HhjVo4rN/O+x3FcgRZZ2Q79vjoHFqFw1MntrolcCsDPvPuY7SABxrxrHBPYPbVaG8plBA==",
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{
							op: "add",
							path: "/metadata",
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
								{ id: "foo123", created: FIRST_TICK },
								{ id: "bar456", created: FIRST_TICK }
							]
						}
					],
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
					hash: "Utd6Kg4vk2814eqbmZwSRE2L7292lfn7rAKskXrJRXo=",
					signature:
						"SubKHkO1ET+QRzujzvKu5zTEll055+Ctu1o8Y5iJHTV6wnk0UjYC3GB398tjrVjd0wjOfqOdRgFCMgbLV5wNBg==",
					created: SECOND_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{ op: "add", path: "/aliases/0/deleted", value: SECOND_TICK },
						{ op: "add", path: "/aliases/-", value: { id: "foo321", created: SECOND_TICK } }
					],
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
				}
			],
			verified: true,
			verification: [{ created: FIRST_TICK }, { created: SECOND_TICK }]
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/metadata",
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
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				}
			],
			hash: "0VMHDaEAIuetBJi6nlnUAbqsWnFPmeSxC9+0fAu42pA=",
			signature:
				"/e90MHyLbkkvPvcG3HhjVo4rN/O+x3FcgRZZ2Q79vjoHFqFw1MntrolcCsDPvPuY7SABxrxrHBPYPbVaG8plBA==",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		expect(changesetStore[1]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: SECOND_TICK,
			userIdentity: TEST_USER_IDENTITY,
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
			hash: "Utd6Kg4vk2814eqbmZwSRE2L7292lfn7rAKskXrJRXo=",
			signature:
				"SubKHkO1ET+QRzujzvKu5zTEll055+Ctu1o8Y5iJHTV6wnk0UjYC3GB398tjrVjd0wjOfqOdRgFCMgbLV5wNBg==",
			immutableStorageId:
				"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
		});

		const immutableStore = immutableStorage.getStore();

		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changesetStore[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		let immutableIntegrity = await decodeJwtToIntegrity(immutableStore[0].data);
		expect(immutableIntegrity.signature).toEqual(
			"/e90MHyLbkkvPvcG3HhjVo4rN/O+x3FcgRZZ2Q79vjoHFqFw1MntrolcCsDPvPuY7SABxrxrHBPYPbVaG8plBA=="
		);
		expect(immutableIntegrity.created).toEqual(FIRST_TICK);
		expect(immutableIntegrity.userIdentity).toEqual(TEST_USER_IDENTITY);
		expect(immutableIntegrity.integrity).toEqual({
			patches: [
				{
					op: "add",
					path: "/metadata",
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
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				}
			]
		});

		immutableIntegrity = await decodeJwtToIntegrity(immutableStore[1].data);
		expect(immutableIntegrity.signature).toEqual(
			"SubKHkO1ET+QRzujzvKu5zTEll055+Ctu1o8Y5iJHTV6wnk0UjYC3GB398tjrVjd0wjOfqOdRgFCMgbLV5wNBg=="
		);
		expect(immutableIntegrity.created).toEqual(SECOND_TICK);

		expect(immutableIntegrity.integrity).toEqual({
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
			]
		});
	});

	test("Can create and update and verify aliases and metadata", async () => {
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
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: SECOND_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Create",
				actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
				object: { "@type": "Note", content: "This is a simple note 2" },
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ id: "foo123", created: FIRST_TICK },
				{ id: "bar456", created: FIRST_TICK }
			],
			changesets: [
				{
					hash: "0VMHDaEAIuetBJi6nlnUAbqsWnFPmeSxC9+0fAu42pA=",
					signature:
						"/e90MHyLbkkvPvcG3HhjVo4rN/O+x3FcgRZZ2Q79vjoHFqFw1MntrolcCsDPvPuY7SABxrxrHBPYPbVaG8plBA==",
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{
							op: "add",
							path: "/metadata",
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
								{ id: "foo123", created: FIRST_TICK },
								{ id: "bar456", created: FIRST_TICK }
							]
						}
					],
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
					hash: "Og/b7ggB83h+4wq3zDp7FT1DOK+qEIuChFnQV2M6UFw=",
					signature:
						"qVnHQT1BBzP6d7tYDqBWv40eXTRazEFDr+LkYp19/cAr5J1lSzFz22UTmZ5JdCA0u3P3tkevaslz0uNMJWCyAg==",
					created: SECOND_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{ op: "replace", path: "/metadata/object/content", value: "This is a simple note 2" }
					],
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
				}
			],
			verified: true,
			verification: [{ created: FIRST_TICK }, { created: SECOND_TICK }]
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/metadata",
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
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				}
			],
			hash: "0VMHDaEAIuetBJi6nlnUAbqsWnFPmeSxC9+0fAu42pA=",
			signature:
				"/e90MHyLbkkvPvcG3HhjVo4rN/O+x3FcgRZZ2Q79vjoHFqFw1MntrolcCsDPvPuY7SABxrxrHBPYPbVaG8plBA==",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		expect(changesetStore[1]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: SECOND_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "replace",
					path: "/metadata/object/content",
					value: "This is a simple note 2"
				}
			],
			hash: "Og/b7ggB83h+4wq3zDp7FT1DOK+qEIuChFnQV2M6UFw=",
			signature:
				"qVnHQT1BBzP6d7tYDqBWv40eXTRazEFDr+LkYp19/cAr5J1lSzFz22UTmZ5JdCA0u3P3tkevaslz0uNMJWCyAg==",
			immutableStorageId:
				"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
		});

		const immutableStore = immutableStorage.getStore();
		expect(`immutable:entity-storage:${immutableStore[0].id}`).toEqual(
			changesetStore[0].immutableStorageId
		);
		expect(immutableStore[0].controller).toEqual(TEST_NODE_IDENTITY);

		let immutableIntegrity = await decodeJwtToIntegrity(immutableStore[0].data);
		expect(immutableIntegrity.signature).toEqual(
			"/e90MHyLbkkvPvcG3HhjVo4rN/O+x3FcgRZZ2Q79vjoHFqFw1MntrolcCsDPvPuY7SABxrxrHBPYPbVaG8plBA=="
		);
		expect(immutableIntegrity.created).toEqual(FIRST_TICK);

		expect(immutableIntegrity.integrity).toEqual({
			patches: [
				{
					op: "add",
					path: "/metadata",
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
							created: FIRST_TICK
						},
						{
							id: "bar456",
							created: FIRST_TICK
						}
					]
				}
			]
		});

		immutableIntegrity = await decodeJwtToIntegrity(immutableStore[1].data);
		expect(immutableIntegrity.signature).toEqual(
			"qVnHQT1BBzP6d7tYDqBWv40eXTRazEFDr+LkYp19/cAr5J1lSzFz22UTmZ5JdCA0u3P3tkevaslz0uNMJWCyAg=="
		);

		expect(immutableIntegrity.integrity).toEqual({
			patches: [
				{
					op: "replace",
					path: "/metadata/object/content",
					value: "This is a simple note 2"
				}
			]
		});
	});

	test("Can create and update and verify aliases, metadata and resources", async () => {
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
					metadata: {
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
					metadata: {
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
					metadata: {
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
					metadata: {
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
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: SECOND_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Create",
				actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
				object: { "@type": "Note", content: "This is a simple note 2" },
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{ id: "foo123", created: FIRST_TICK },
				{ id: "bar456", created: FIRST_TICK }
			],
			resources: [
				{
					id: "resource1",
					created: FIRST_TICK,
					updated: SECOND_TICK,
					metadata: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
						object: { "@type": "Note", content: "This is a simple note resource 10" },
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "resource2",
					created: FIRST_TICK,
					updated: SECOND_TICK,
					metadata: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
						object: { "@type": "Note", content: "This is a simple note resource 11" },
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			changesets: [
				{
					hash: "Tkc0/RReCBn307kfgUyc2YGqHV+jizsYCySVaYc+4+U=",
					signature:
						"AOqjzgjhXI8JXMRLV3cXBJJzZ7jJf89vITgsimGOEnN0Xn0W25pokKf47jKlOqrcZlB4Gt6IkSWkmw3KtQU7DQ==",
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{
							op: "add",
							path: "/metadata",
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
								{ id: "foo123", created: FIRST_TICK },
								{ id: "bar456", created: FIRST_TICK }
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
										"@context": "https://www.w3.org/ns/activitystreams",
										"@type": "Create",
										actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
										object: { "@type": "Note", content: "This is a simple note resource" },
										published: "2015-01-25T12:34:56Z"
									}
								},
								{
									id: "resource2",
									created: FIRST_TICK,
									metadata: {
										"@context": "https://www.w3.org/ns/activitystreams",
										"@type": "Create",
										actor: { "@type": "Person", "@id": "acct:person@example.org", name: "Person" },
										object: { "@type": "Note", content: "This is a simple note resource 2" },
										published: "2015-01-25T12:34:56Z"
									}
								}
							]
						}
					],
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
					hash: "JjtD2ONbYEFNCqgMoFYwjufOdB2e6EwvZMABM8syQ6Q=",
					signature:
						"xDnUf+WPlPzv7OoAqLwX3Gr2lRgDQ0Ap2yNxiyjsdww/ucdPef0uQSx8Zvaz10KuQGyqYFYuYjs90oP3bdOcAQ==",
					created: SECOND_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{ op: "replace", path: "/metadata/object/content", value: "This is a simple note 2" },
						{ op: "add", path: "/resources/0/updated", value: SECOND_TICK },
						{
							op: "replace",
							path: "/resources/0/metadata/object/content",
							value: "This is a simple note resource 10"
						},
						{ op: "add", path: "/resources/1/updated", value: SECOND_TICK },
						{
							op: "replace",
							path: "/resources/1/metadata/object/content",
							value: "This is a simple note resource 11"
						}
					],
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
				}
			],
			verified: true,
			verification: [{ created: FIRST_TICK }, { created: SECOND_TICK }]
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/metadata",
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
							created: FIRST_TICK,
							metadata: {
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
			hash: "Tkc0/RReCBn307kfgUyc2YGqHV+jizsYCySVaYc+4+U=",
			signature:
				"AOqjzgjhXI8JXMRLV3cXBJJzZ7jJf89vITgsimGOEnN0Xn0W25pokKf47jKlOqrcZlB4Gt6IkSWkmw3KtQU7DQ==",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		expect(changesetStore[1]).toEqual({
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: SECOND_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "replace",
					path: "/metadata/object/content",
					value: "This is a simple note 2"
				},
				{
					op: "add",
					path: "/resources/0/updated",
					value: SECOND_TICK
				},
				{
					op: "replace",
					path: "/resources/0/metadata/object/content",
					value: "This is a simple note resource 10"
				},
				{
					op: "add",
					path: "/resources/1/updated",
					value: SECOND_TICK
				},
				{
					op: "replace",
					path: "/resources/1/metadata/object/content",
					value: "This is a simple note resource 11"
				}
			],
			hash: "JjtD2ONbYEFNCqgMoFYwjufOdB2e6EwvZMABM8syQ6Q=",
			signature:
				"xDnUf+WPlPzv7OoAqLwX3Gr2lRgDQ0Ap2yNxiyjsdww/ucdPef0uQSx8Zvaz10KuQGyqYFYuYjs90oP3bdOcAQ==",
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
			"AOqjzgjhXI8JXMRLV3cXBJJzZ7jJf89vITgsimGOEnN0Xn0W25pokKf47jKlOqrcZlB4Gt6IkSWkmw3KtQU7DQ=="
		);

		expect(credentialSignature.integrity).toEqual({
			patches: [
				{
					op: "add",
					path: "/metadata",
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
							created: FIRST_TICK,
							id: "foo123"
						},
						{
							created: FIRST_TICK,
							id: "bar456"
						}
					]
				},
				{
					op: "add",
					path: "/resources",
					value: [
						{
							created: FIRST_TICK,
							id: "resource1",
							metadata: {
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
							created: FIRST_TICK,
							id: "resource2",
							metadata: {
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
		});

		credentialSignature = await decodeJwtToIntegrity(immutableStore[1].data);
		expect(credentialSignature.signature).toEqual(
			"xDnUf+WPlPzv7OoAqLwX3Gr2lRgDQ0Ap2yNxiyjsdww/ucdPef0uQSx8Zvaz10KuQGyqYFYuYjs90oP3bdOcAQ=="
		);

		expect(credentialSignature.integrity).toEqual({
			patches: [
				{ op: "replace", path: "/metadata/object/content", value: "This is a simple note 2" },
				{ op: "add", path: "/resources/0/updated", value: SECOND_TICK },
				{
					op: "replace",
					path: "/resources/0/metadata/object/content",
					value: "This is a simple note resource 10"
				},
				{ op: "add", path: "/resources/1/updated", value: SECOND_TICK },
				{
					op: "replace",
					path: "/resources/1/metadata/object/content",
					value: "This is a simple note resource 11"
				}
			]
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
					relationship: "friend",
					metadata: {
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
					relationship: "frenemy",
					metadata: {
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
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: SECOND_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			edges: [
				{
					id: "edge1",
					created: FIRST_TICK,
					updated: SECOND_TICK,
					relationship: "frenemy",
					metadata: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
						object: { "@type": "Note", content: "This is a simple note 2" },
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			changesets: [
				{
					hash: "r6+XCDXDoVoZfIBtDlORWaWb/eMIietTidH1JPXRdVs=",
					signature:
						"15NWO1jt1r8YQ5O0HGk/U9DE9Gaf7KzDxL8vw5+puOh8f6tqEsNVikSkpvY9BMGRGp1Bzw+ohn7vwVBN6IA0BQ==",
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{
							op: "add",
							path: "/edges",
							value: [
								{
									id: "edge1",
									created: FIRST_TICK,
									metadata: {
										"@context": "https://www.w3.org/ns/activitystreams",
										"@type": "Create",
										actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
										object: { "@type": "Note", content: "This is a simple note" },
										published: "2015-01-25T12:34:56Z"
									},
									relationship: "friend"
								}
							]
						}
					],
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
					hash: "9HOMirKU9l+iZa+b4WPprlNKCdmWBFB0m5fQxjRdzF8=",
					signature:
						"ilyqMQXLjXq1ZvHvIboUh/mN4uozZ1vOhmKCPr/9HHKfdDk86gUOD/7E2fhcOvlg+jjAVhu64Nx8xGYQzhOQAg==",
					created: SECOND_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{ op: "add", path: "/edges/0/updated", value: SECOND_TICK },
						{ op: "replace", path: "/edges/0/relationship", value: "frenemy" },
						{
							op: "replace",
							path: "/edges/0/metadata/object/content",
							value: "This is a simple note 2"
						}
					],
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
				}
			],
			verified: true,
			verification: [{ created: FIRST_TICK }, { created: SECOND_TICK }]
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			hash: "r6+XCDXDoVoZfIBtDlORWaWb/eMIietTidH1JPXRdVs=",
			signature:
				"15NWO1jt1r8YQ5O0HGk/U9DE9Gaf7KzDxL8vw5+puOh8f6tqEsNVikSkpvY9BMGRGp1Bzw+ohn7vwVBN6IA0BQ==",
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/edges",
					value: [
						{
							id: "edge1",
							created: FIRST_TICK,
							metadata: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple note" },
								published: "2015-01-25T12:34:56Z"
							},
							relationship: "friend"
						}
					]
				}
			],
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		expect(changesetStore[1]).toEqual({
			hash: "9HOMirKU9l+iZa+b4WPprlNKCdmWBFB0m5fQxjRdzF8=",
			signature:
				"ilyqMQXLjXq1ZvHvIboUh/mN4uozZ1vOhmKCPr/9HHKfdDk86gUOD/7E2fhcOvlg+jjAVhu64Nx8xGYQzhOQAg==",
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: SECOND_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{ op: "add", path: "/edges/0/updated", value: SECOND_TICK },
				{ op: "replace", path: "/edges/0/relationship", value: "frenemy" },
				{
					op: "replace",
					path: "/edges/0/metadata/object/content",
					value: "This is a simple note 2"
				}
			],
			immutableStorageId:
				"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
		});
	});

	test("Can create and update and verify aliases, metadata, resources and edges", async () => {
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
					metadata: {
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
					metadata: {
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
					metadata: {
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
					metadata: {
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
					relationship: "friend",
					metadata: {
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
					relationship: "enemy",
					metadata: {
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
					metadata: {
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
					metadata: {
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
					metadata: {
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
					metadata: {
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
					relationship: "friend",
					metadata: {
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
					relationship: "enemy",
					metadata: {
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
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: SECOND_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: {
				"@context": "https://www.w3.org/ns/activitystreams",
				"@type": "Create",
				actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
				object: { "@type": "Note", content: "This is a simple note 2" },
				published: "2015-01-25T12:34:56Z"
			},
			aliases: [
				{
					id: "foo123",
					created: FIRST_TICK,
					updated: SECOND_TICK,
					metadata: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
						object: { "@type": "Note", content: "This is a simple note alias 10" },
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "bar456",
					created: FIRST_TICK,
					updated: SECOND_TICK,
					metadata: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
						object: { "@type": "Note", content: "This is a simple note alias 20" },
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			resources: [
				{
					id: "resource1",
					created: FIRST_TICK,
					updated: SECOND_TICK,
					metadata: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
						object: { "@type": "Note", content: "This is a simple note resource 10" },
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "resource2",
					created: FIRST_TICK,
					updated: SECOND_TICK,
					metadata: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
						object: { "@type": "Note", content: "This is a simple note resource 20" },
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			edges: [
				{
					id: "edge1",
					created: FIRST_TICK,
					updated: SECOND_TICK,
					relationship: "friend",
					metadata: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
						object: { "@type": "Note", content: "This is a simple note edge 10" },
						published: "2015-01-25T12:34:56Z"
					}
				},
				{
					id: "edge2",
					created: FIRST_TICK,
					updated: SECOND_TICK,
					relationship: "enemy",
					metadata: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
						object: { "@type": "Note", content: "This is a simple note edge 20" },
						published: "2015-01-25T12:34:56Z"
					}
				}
			],
			changesets: [
				{
					hash: "jTb9qgSQtXraoLWMpEB8DqHby6amfHbh2rdKu1O/144=",
					signature:
						"623KrKM43+giT9gpq12YewVrY2Cn2qGkHFubvQDyamHnpowgur2aK5QHwunM1NmxzKc8v2QbAxHf9hQQq2TPAg==",
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{
							op: "add",
							path: "/metadata",
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
									created: FIRST_TICK,
									metadata: {
										"@context": "https://www.w3.org/ns/activitystreams",
										"@type": "Create",
										actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
										object: { "@type": "Note", content: "This is a simple alias 1" },
										published: "2015-01-25T12:34:56Z"
									}
								},
								{
									id: "bar456",
									created: FIRST_TICK,
									metadata: {
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
									created: FIRST_TICK,
									metadata: {
										"@context": "https://www.w3.org/ns/activitystreams",
										"@type": "Create",
										actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
										object: { "@type": "Note", content: "This is a simple note resource 1" },
										published: "2015-01-25T12:34:56Z"
									}
								},
								{
									id: "resource2",
									created: FIRST_TICK,
									metadata: {
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
									created: FIRST_TICK,
									metadata: {
										"@context": "https://www.w3.org/ns/activitystreams",
										"@type": "Create",
										actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
										object: { "@type": "Note", content: "This is a simple edge 1" },
										published: "2015-01-25T12:34:56Z"
									},
									relationship: "friend"
								},
								{
									id: "edge2",
									created: FIRST_TICK,
									metadata: {
										"@context": "https://www.w3.org/ns/activitystreams",
										"@type": "Create",
										actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
										object: { "@type": "Note", content: "This is a simple edge 2" },
										published: "2015-01-25T12:34:56Z"
									},
									relationship: "enemy"
								}
							]
						}
					],
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
					hash: "snnM4wJd36iJyQU3z2RyJNpbJKyFUch/0itVwmBpPOQ=",
					signature:
						"ZIPvcuMyzIX/2VsymzuigdSoC1lbGqHO3jj/rm9w1eCWo6vTeyLIxy/k5x0/hMf1Ls4l9o+ELt5jN/ITAFSrDA==",
					created: SECOND_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{ op: "replace", path: "/metadata/object/content", value: "This is a simple note 2" },
						{ op: "add", path: "/aliases/0/updated", value: SECOND_TICK },
						{
							op: "replace",
							path: "/aliases/0/metadata/object/content",
							value: "This is a simple note alias 10"
						},
						{ op: "add", path: "/aliases/1/updated", value: SECOND_TICK },
						{
							op: "replace",
							path: "/aliases/1/metadata/object/content",
							value: "This is a simple note alias 20"
						},
						{ op: "add", path: "/resources/0/updated", value: SECOND_TICK },
						{
							op: "replace",
							path: "/resources/0/metadata/object/content",
							value: "This is a simple note resource 10"
						},
						{ op: "add", path: "/resources/1/updated", value: SECOND_TICK },
						{
							op: "replace",
							path: "/resources/1/metadata/object/content",
							value: "This is a simple note resource 20"
						},
						{ op: "add", path: "/edges/0/updated", value: SECOND_TICK },
						{
							op: "replace",
							path: "/edges/0/metadata/object/content",
							value: "This is a simple note edge 10"
						},
						{ op: "add", path: "/edges/1/updated", value: SECOND_TICK },
						{
							op: "replace",
							path: "/edges/1/metadata/object/content",
							value: "This is a simple note edge 20"
						}
					],
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
				}
			],
			verified: true,
			verification: [{ created: FIRST_TICK }, { created: SECOND_TICK }]
		});

		const changesetStore = changesetStorage.getStore();

		expect(changesetStore[0]).toEqual({
			hash: "jTb9qgSQtXraoLWMpEB8DqHby6amfHbh2rdKu1O/144=",
			signature:
				"623KrKM43+giT9gpq12YewVrY2Cn2qGkHFubvQDyamHnpowgur2aK5QHwunM1NmxzKc8v2QbAxHf9hQQq2TPAg==",
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/metadata",
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
							created: FIRST_TICK,
							metadata: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple alias 1" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							id: "bar456",
							created: FIRST_TICK,
							metadata: {
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
							created: FIRST_TICK,
							metadata: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple note resource 1" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							id: "resource2",
							created: FIRST_TICK,
							metadata: {
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
							created: FIRST_TICK,
							metadata: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple edge 1" },
								published: "2015-01-25T12:34:56Z"
							},
							relationship: "friend"
						},
						{
							id: "edge2",
							created: FIRST_TICK,
							metadata: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple edge 2" },
								published: "2015-01-25T12:34:56Z"
							},
							relationship: "enemy"
						}
					]
				}
			],
			immutableStorageId:
				"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
		});

		expect(changesetStore[1]).toEqual({
			hash: "snnM4wJd36iJyQU3z2RyJNpbJKyFUch/0itVwmBpPOQ=",
			signature:
				"ZIPvcuMyzIX/2VsymzuigdSoC1lbGqHO3jj/rm9w1eCWo6vTeyLIxy/k5x0/hMf1Ls4l9o+ELt5jN/ITAFSrDA==",
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: SECOND_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{ op: "replace", path: "/metadata/object/content", value: "This is a simple note 2" },
				{ op: "add", path: "/aliases/0/updated", value: SECOND_TICK },
				{
					op: "replace",
					path: "/aliases/0/metadata/object/content",
					value: "This is a simple note alias 10"
				},
				{ op: "add", path: "/aliases/1/updated", value: SECOND_TICK },
				{
					op: "replace",
					path: "/aliases/1/metadata/object/content",
					value: "This is a simple note alias 20"
				},
				{ op: "add", path: "/resources/0/updated", value: SECOND_TICK },
				{
					op: "replace",
					path: "/resources/0/metadata/object/content",
					value: "This is a simple note resource 10"
				},
				{ op: "add", path: "/resources/1/updated", value: SECOND_TICK },
				{
					op: "replace",
					path: "/resources/1/metadata/object/content",
					value: "This is a simple note resource 20"
				},
				{ op: "add", path: "/edges/0/updated", value: SECOND_TICK },
				{
					op: "replace",
					path: "/edges/0/metadata/object/content",
					value: "This is a simple note edge 10"
				},
				{ op: "add", path: "/edges/1/updated", value: SECOND_TICK },
				{
					op: "replace",
					path: "/edges/1/metadata/object/content",
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

		let credentialSignature = await decodeJwtToIntegrity(immutableStore[0].data);

		expect(credentialSignature.signature).toEqual(
			"623KrKM43+giT9gpq12YewVrY2Cn2qGkHFubvQDyamHnpowgur2aK5QHwunM1NmxzKc8v2QbAxHf9hQQq2TPAg=="
		);

		expect(credentialSignature.integrity).toEqual({
			patches: [
				{
					op: "add",
					path: "/metadata",
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
							created: FIRST_TICK,
							id: "foo123",
							metadata: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple alias 1" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							created: FIRST_TICK,
							id: "bar456",
							metadata: {
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
							created: FIRST_TICK,
							id: "resource1",
							metadata: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple note resource 1" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							created: FIRST_TICK,
							id: "resource2",
							metadata: {
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
							created: FIRST_TICK,
							id: "edge1",
							metadata: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple edge 1" },
								published: "2015-01-25T12:34:56Z"
							},
							relationship: "friend"
						},
						{
							created: FIRST_TICK,
							id: "edge2",
							metadata: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple edge 2" },
								published: "2015-01-25T12:34:56Z"
							},
							relationship: "enemy"
						}
					]
				}
			]
		});

		credentialSignature = await decodeJwtToIntegrity(immutableStore[1].data);

		expect(credentialSignature.signature).toEqual(
			"ZIPvcuMyzIX/2VsymzuigdSoC1lbGqHO3jj/rm9w1eCWo6vTeyLIxy/k5x0/hMf1Ls4l9o+ELt5jN/ITAFSrDA=="
		);

		expect(credentialSignature.integrity).toEqual({
			patches: [
				{ op: "replace", path: "/metadata/object/content", value: "This is a simple note 2" },
				{ op: "add", path: "/aliases/0/updated", value: SECOND_TICK },
				{
					op: "replace",
					path: "/aliases/0/metadata/object/content",
					value: "This is a simple note alias 10"
				},
				{ op: "add", path: "/aliases/1/updated", value: SECOND_TICK },
				{
					op: "replace",
					path: "/aliases/1/metadata/object/content",
					value: "This is a simple note alias 20"
				},
				{ op: "add", path: "/resources/0/updated", value: SECOND_TICK },
				{
					op: "replace",
					path: "/resources/0/metadata/object/content",
					value: "This is a simple note resource 10"
				},
				{ op: "add", path: "/resources/1/updated", value: SECOND_TICK },
				{
					op: "replace",
					path: "/resources/1/metadata/object/content",
					value: "This is a simple note resource 20"
				},
				{ op: "add", path: "/edges/0/updated", value: SECOND_TICK },
				{
					op: "replace",
					path: "/edges/0/metadata/object/content",
					value: "This is a simple note edge 10"
				},
				{ op: "add", path: "/edges/1/updated", value: SECOND_TICK },
				{
					op: "replace",
					path: "/edges/1/metadata/object/content",
					value: "This is a simple note edge 20"
				}
			]
		});
	});

	test("Can get an updated vertex as JSON-LD", async () => {
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
					format: "type1",
					metadata: {
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
					format: "type2",
					metadata: {
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
					metadata: {
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
					metadata: {
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
					relationship: "friend",
					metadata: {
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
					relationship: "enemy",
					metadata: {
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
					format: "type1",
					metadata: {
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
					format: "type2",
					metadata: {
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
					metadata: {
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
					metadata: {
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
					relationship: "friend",
					metadata: {
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
					relationship: "enemy",
					metadata: {
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

		const result = await service.get(id, undefined, "jsonld");

		expect(result).toEqual({
			"@context": "https://schema.gtsc.io/aig/",
			"@type": "vertex",
			aliases: [
				{
					"@type": "alias",
					created: "2024-08-22T11:55:16.271Z",
					format: "type1",
					id: "foo123",
					metadata: {
						"@type": "https://www.w3.org/ns/activitystreams#Create",
						"https://www.w3.org/ns/activitystreams#actor": {
							"@id": "acct:person@example.org",
							"@type": "https://www.w3.org/ns/activitystreams#Person",
							"https://www.w3.org/ns/activitystreams#name": "Person"
						},
						"https://www.w3.org/ns/activitystreams#object": {
							"@type": "https://www.w3.org/ns/activitystreams#Note",
							"https://www.w3.org/ns/activitystreams#content": "This is a simple note alias 10"
						},
						"https://www.w3.org/ns/activitystreams#published": {
							"@type": "http://www.w3.org/2001/XMLSchema#dateTime",
							"@value": "2015-01-25T12:34:56Z"
						}
					},
					updated: "2024-08-22T11:56:56.272Z"
				},
				{
					"@type": "alias",
					created: "2024-08-22T11:55:16.271Z",
					format: "type2",
					id: "bar456",
					metadata: {
						"@type": "https://www.w3.org/ns/activitystreams#Create",
						"https://www.w3.org/ns/activitystreams#actor": {
							"@id": "acct:person@example.org",
							"@type": "https://www.w3.org/ns/activitystreams#Person",
							"https://www.w3.org/ns/activitystreams#name": "Person"
						},
						"https://www.w3.org/ns/activitystreams#object": {
							"@type": "https://www.w3.org/ns/activitystreams#Note",
							"https://www.w3.org/ns/activitystreams#content": "This is a simple note alias 20"
						},
						"https://www.w3.org/ns/activitystreams#published": {
							"@type": "http://www.w3.org/2001/XMLSchema#dateTime",
							"@value": "2015-01-25T12:34:56Z"
						}
					},
					updated: "2024-08-22T11:56:56.272Z"
				}
			],
			edges: [
				{
					"@type": "edge",
					created: "2024-08-22T11:55:16.271Z",
					id: "edge1",
					metadata: {
						"@type": "https://www.w3.org/ns/activitystreams#Create",
						"https://www.w3.org/ns/activitystreams#actor": {
							"@id": "acct:person@example.org",
							"@type": "https://www.w3.org/ns/activitystreams#Person",
							"https://www.w3.org/ns/activitystreams#name": "Person"
						},
						"https://www.w3.org/ns/activitystreams#object": {
							"@type": "https://www.w3.org/ns/activitystreams#Note",
							"https://www.w3.org/ns/activitystreams#content": "This is a simple note edge 10"
						},
						"https://www.w3.org/ns/activitystreams#published": {
							"@type": "http://www.w3.org/2001/XMLSchema#dateTime",
							"@value": "2015-01-25T12:34:56Z"
						}
					},
					relationship: "friend",
					updated: "2024-08-22T11:56:56.272Z"
				},
				{
					"@type": "edge",
					created: "2024-08-22T11:55:16.271Z",
					id: "edge2",
					metadata: {
						"@type": "https://www.w3.org/ns/activitystreams#Create",
						"https://www.w3.org/ns/activitystreams#actor": {
							"@id": "acct:person@example.org",
							"@type": "https://www.w3.org/ns/activitystreams#Person",
							"https://www.w3.org/ns/activitystreams#name": "Person"
						},
						"https://www.w3.org/ns/activitystreams#object": {
							"@type": "https://www.w3.org/ns/activitystreams#Note",
							"https://www.w3.org/ns/activitystreams#content": "This is a simple note edge 20"
						},
						"https://www.w3.org/ns/activitystreams#published": {
							"@type": "http://www.w3.org/2001/XMLSchema#dateTime",
							"@value": "2015-01-25T12:34:56Z"
						}
					},
					relationship: "enemy",
					updated: "2024-08-22T11:56:56.272Z"
				}
			],
			resources: [
				{
					"@type": "resource",
					created: "2024-08-22T11:55:16.271Z",
					id: "resource1",
					metadata: {
						"@type": "https://www.w3.org/ns/activitystreams#Create",
						"https://www.w3.org/ns/activitystreams#actor": {
							"@id": "acct:person@example.org",
							"@type": "https://www.w3.org/ns/activitystreams#Person",
							"https://www.w3.org/ns/activitystreams#name": "Person"
						},
						"https://www.w3.org/ns/activitystreams#object": {
							"@type": "https://www.w3.org/ns/activitystreams#Note",
							"https://www.w3.org/ns/activitystreams#content": "This is a simple note resource 10"
						},
						"https://www.w3.org/ns/activitystreams#published": {
							"@type": "http://www.w3.org/2001/XMLSchema#dateTime",
							"@value": "2015-01-25T12:34:56Z"
						}
					},
					updated: "2024-08-22T11:56:56.272Z"
				},
				{
					"@type": "resource",
					created: "2024-08-22T11:55:16.271Z",
					id: "resource2",
					metadata: {
						"@type": "https://www.w3.org/ns/activitystreams#Create",
						"https://www.w3.org/ns/activitystreams#actor": {
							"@id": "acct:person@example.org",
							"@type": "https://www.w3.org/ns/activitystreams#Person",
							"https://www.w3.org/ns/activitystreams#name": "Person"
						},
						"https://www.w3.org/ns/activitystreams#object": {
							"@type": "https://www.w3.org/ns/activitystreams#Note",
							"https://www.w3.org/ns/activitystreams#content": "This is a simple note resource 20"
						},
						"https://www.w3.org/ns/activitystreams#published": {
							"@type": "http://www.w3.org/2001/XMLSchema#dateTime",
							"@value": "2015-01-25T12:34:56Z"
						}
					},
					updated: "2024-08-22T11:56:56.272Z"
				}
			],
			created: "2024-08-22T11:55:16.271Z",
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			metadata: {
				"@type": "https://www.w3.org/ns/activitystreams#Create",
				"https://www.w3.org/ns/activitystreams#actor": {
					"@id": "acct:person@example.org",
					"@type": "https://www.w3.org/ns/activitystreams#Person",
					"https://www.w3.org/ns/activitystreams#name": "Person"
				},
				"https://www.w3.org/ns/activitystreams#object": {
					"@type": "https://www.w3.org/ns/activitystreams#Note",
					"https://www.w3.org/ns/activitystreams#content": "This is a simple note 2"
				},
				"https://www.w3.org/ns/activitystreams#published": {
					"@type": "http://www.w3.org/2001/XMLSchema#dateTime",
					"@value": "2015-01-25T12:34:56Z"
				}
			},
			nodeIdentity: TEST_NODE_IDENTITY,
			updated: "2024-08-22T11:56:56.272Z"
		});
	});

	test("Can get an updated vertex as JSON-LD with changeset", async () => {
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
					metadata: {
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
					metadata: {
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
					metadata: {
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
					metadata: {
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
					relationship: "friend",
					metadata: {
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
					relationship: "enemy",
					metadata: {
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
					metadata: {
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
					metadata: {
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
					metadata: {
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
					metadata: {
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
					relationship: "friend",
					metadata: {
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
					relationship: "enemy",
					metadata: {
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

		const result = await service.get(
			id,
			{
				includeChangesets: true
			},
			"jsonld"
		);

		expect(result).toEqual({
			"@context": "https://schema.gtsc.io/aig/",
			"@type": "vertex",
			aliases: [
				{
					"@type": "alias",
					created: "2024-08-22T11:55:16.271Z",
					id: "foo123",
					metadata: {
						"@type": "https://www.w3.org/ns/activitystreams#Create",
						"https://www.w3.org/ns/activitystreams#actor": {
							"@id": "acct:person@example.org",
							"@type": "https://www.w3.org/ns/activitystreams#Person",
							"https://www.w3.org/ns/activitystreams#name": "Person"
						},
						"https://www.w3.org/ns/activitystreams#object": {
							"@type": "https://www.w3.org/ns/activitystreams#Note",
							"https://www.w3.org/ns/activitystreams#content": "This is a simple note alias 10"
						},
						"https://www.w3.org/ns/activitystreams#published": {
							"@type": "http://www.w3.org/2001/XMLSchema#dateTime",
							"@value": "2015-01-25T12:34:56Z"
						}
					},
					updated: "2024-08-22T11:56:56.272Z"
				},
				{
					"@type": "alias",
					created: "2024-08-22T11:55:16.271Z",
					id: "bar456",
					metadata: {
						"@type": "https://www.w3.org/ns/activitystreams#Create",
						"https://www.w3.org/ns/activitystreams#actor": {
							"@id": "acct:person@example.org",
							"@type": "https://www.w3.org/ns/activitystreams#Person",
							"https://www.w3.org/ns/activitystreams#name": "Person"
						},
						"https://www.w3.org/ns/activitystreams#object": {
							"@type": "https://www.w3.org/ns/activitystreams#Note",
							"https://www.w3.org/ns/activitystreams#content": "This is a simple note alias 20"
						},
						"https://www.w3.org/ns/activitystreams#published": {
							"@type": "http://www.w3.org/2001/XMLSchema#dateTime",
							"@value": "2015-01-25T12:34:56Z"
						}
					},
					updated: "2024-08-22T11:56:56.272Z"
				}
			],
			changesets: [
				{
					"@type": "changeset",
					patches: [
						{
							"@type": "patch",
							patchOperation: "add",
							patchPath: "/metadata",
							patchValue: {
								"@context": "https://www.w3.org/ns/activitystreams",
								"@type": "Create",
								actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
								object: { "@type": "Note", content: "This is a simple note" },
								published: "2015-01-25T12:34:56Z"
							}
						},
						{
							"@type": "patch",
							patchOperation: "add",
							patchPath: "/aliases",
							patchValue: [
								{
									id: "foo123",
									created: FIRST_TICK,
									metadata: {
										"@context": "https://www.w3.org/ns/activitystreams",
										"@type": "Create",
										actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
										object: { "@type": "Note", content: "This is a simple alias 1" },
										published: "2015-01-25T12:34:56Z"
									}
								},
								{
									id: "bar456",
									created: FIRST_TICK,
									metadata: {
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
							"@type": "patch",
							patchOperation: "add",
							patchPath: "/resources",
							patchValue: [
								{
									id: "resource1",
									created: FIRST_TICK,
									metadata: {
										"@context": "https://www.w3.org/ns/activitystreams",
										"@type": "Create",
										actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
										object: { "@type": "Note", content: "This is a simple note resource 1" },
										published: "2015-01-25T12:34:56Z"
									}
								},
								{
									id: "resource2",
									created: FIRST_TICK,
									metadata: {
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
							"@type": "patch",
							patchOperation: "add",
							patchPath: "/edges",
							patchValue: [
								{
									id: "edge1",
									created: FIRST_TICK,
									metadata: {
										"@context": "https://www.w3.org/ns/activitystreams",
										"@type": "Create",
										actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
										object: { "@type": "Note", content: "This is a simple edge 1" },
										published: "2015-01-25T12:34:56Z"
									},
									relationship: "friend"
								},
								{
									id: "edge2",
									created: FIRST_TICK,
									metadata: {
										"@context": "https://www.w3.org/ns/activitystreams",
										"@type": "Create",
										actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
										object: { "@type": "Note", content: "This is a simple edge 2" },
										published: "2015-01-25T12:34:56Z"
									},
									relationship: "enemy"
								}
							]
						}
					],
					created: "2024-08-22T11:55:16.271Z",
					hash: "jTb9qgSQtXraoLWMpEB8DqHby6amfHbh2rdKu1O/144=",
					signature:
						"623KrKM43+giT9gpq12YewVrY2Cn2qGkHFubvQDyamHnpowgur2aK5QHwunM1NmxzKc8v2QbAxHf9hQQq2TPAg==",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303",
					userIdentity: TEST_USER_IDENTITY
				},
				{
					"@type": "changeset",
					patches: [
						{
							"@type": "patch",
							patchOperation: "replace",
							patchPath: "/metadata/object/content",
							patchValue: "This is a simple note 2"
						},
						{
							"@type": "patch",
							patchOperation: "add",
							patchPath: "/aliases/0/updated",
							patchValue: SECOND_TICK
						},
						{
							"@type": "patch",
							patchOperation: "replace",
							patchPath: "/aliases/0/metadata/object/content",
							patchValue: "This is a simple note alias 10"
						},
						{
							"@type": "patch",
							patchOperation: "add",
							patchPath: "/aliases/1/updated",
							patchValue: SECOND_TICK
						},
						{
							"@type": "patch",
							patchOperation: "replace",
							patchPath: "/aliases/1/metadata/object/content",
							patchValue: "This is a simple note alias 20"
						},
						{
							"@type": "patch",
							patchOperation: "add",
							patchPath: "/resources/0/updated",
							patchValue: SECOND_TICK
						},
						{
							"@type": "patch",
							patchOperation: "replace",
							patchPath: "/resources/0/metadata/object/content",
							patchValue: "This is a simple note resource 10"
						},
						{
							"@type": "patch",
							patchOperation: "add",
							patchPath: "/resources/1/updated",
							patchValue: SECOND_TICK
						},
						{
							"@type": "patch",
							patchOperation: "replace",
							patchPath: "/resources/1/metadata/object/content",
							patchValue: "This is a simple note resource 20"
						},
						{
							"@type": "patch",
							patchOperation: "add",
							patchPath: "/edges/0/updated",
							patchValue: SECOND_TICK
						},
						{
							"@type": "patch",
							patchOperation: "replace",
							patchPath: "/edges/0/metadata/object/content",
							patchValue: "This is a simple note edge 10"
						},
						{
							"@type": "patch",
							patchOperation: "add",
							patchPath: "/edges/1/updated",
							patchValue: SECOND_TICK
						},
						{
							"@type": "patch",
							patchOperation: "replace",
							patchPath: "/edges/1/metadata/object/content",
							patchValue: "This is a simple note edge 20"
						}
					],
					created: "2024-08-22T11:56:56.272Z",
					hash: "snnM4wJd36iJyQU3z2RyJNpbJKyFUch/0itVwmBpPOQ=",
					signature:
						"ZIPvcuMyzIX/2VsymzuigdSoC1lbGqHO3jj/rm9w1eCWo6vTeyLIxy/k5x0/hMf1Ls4l9o+ELt5jN/ITAFSrDA==",
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505",
					userIdentity: TEST_USER_IDENTITY
				}
			],
			edges: [
				{
					"@type": "edge",
					created: "2024-08-22T11:55:16.271Z",
					id: "edge1",
					metadata: {
						"@type": "https://www.w3.org/ns/activitystreams#Create",
						"https://www.w3.org/ns/activitystreams#actor": {
							"@id": "acct:person@example.org",
							"@type": "https://www.w3.org/ns/activitystreams#Person",
							"https://www.w3.org/ns/activitystreams#name": "Person"
						},
						"https://www.w3.org/ns/activitystreams#object": {
							"@type": "https://www.w3.org/ns/activitystreams#Note",
							"https://www.w3.org/ns/activitystreams#content": "This is a simple note edge 10"
						},
						"https://www.w3.org/ns/activitystreams#published": {
							"@type": "http://www.w3.org/2001/XMLSchema#dateTime",
							"@value": "2015-01-25T12:34:56Z"
						}
					},
					relationship: "friend",
					updated: "2024-08-22T11:56:56.272Z"
				},
				{
					"@type": "edge",
					created: "2024-08-22T11:55:16.271Z",
					id: "edge2",
					metadata: {
						"@type": "https://www.w3.org/ns/activitystreams#Create",
						"https://www.w3.org/ns/activitystreams#actor": {
							"@id": "acct:person@example.org",
							"@type": "https://www.w3.org/ns/activitystreams#Person",
							"https://www.w3.org/ns/activitystreams#name": "Person"
						},
						"https://www.w3.org/ns/activitystreams#object": {
							"@type": "https://www.w3.org/ns/activitystreams#Note",
							"https://www.w3.org/ns/activitystreams#content": "This is a simple note edge 20"
						},
						"https://www.w3.org/ns/activitystreams#published": {
							"@type": "http://www.w3.org/2001/XMLSchema#dateTime",
							"@value": "2015-01-25T12:34:56Z"
						}
					},
					relationship: "enemy",
					updated: "2024-08-22T11:56:56.272Z"
				}
			],
			resources: [
				{
					"@type": "resource",
					created: "2024-08-22T11:55:16.271Z",
					id: "resource1",
					metadata: {
						"@type": "https://www.w3.org/ns/activitystreams#Create",
						"https://www.w3.org/ns/activitystreams#actor": {
							"@id": "acct:person@example.org",
							"@type": "https://www.w3.org/ns/activitystreams#Person",
							"https://www.w3.org/ns/activitystreams#name": "Person"
						},
						"https://www.w3.org/ns/activitystreams#object": {
							"@type": "https://www.w3.org/ns/activitystreams#Note",
							"https://www.w3.org/ns/activitystreams#content": "This is a simple note resource 10"
						},
						"https://www.w3.org/ns/activitystreams#published": {
							"@type": "http://www.w3.org/2001/XMLSchema#dateTime",
							"@value": "2015-01-25T12:34:56Z"
						}
					},
					updated: "2024-08-22T11:56:56.272Z"
				},
				{
					"@type": "resource",
					created: "2024-08-22T11:55:16.271Z",
					id: "resource2",
					metadata: {
						"@type": "https://www.w3.org/ns/activitystreams#Create",
						"https://www.w3.org/ns/activitystreams#actor": {
							"@id": "acct:person@example.org",
							"@type": "https://www.w3.org/ns/activitystreams#Person",
							"https://www.w3.org/ns/activitystreams#name": "Person"
						},
						"https://www.w3.org/ns/activitystreams#object": {
							"@type": "https://www.w3.org/ns/activitystreams#Note",
							"https://www.w3.org/ns/activitystreams#content": "This is a simple note resource 20"
						},
						"https://www.w3.org/ns/activitystreams#published": {
							"@type": "http://www.w3.org/2001/XMLSchema#dateTime",
							"@value": "2015-01-25T12:34:56Z"
						}
					},
					updated: "2024-08-22T11:56:56.272Z"
				}
			],
			created: "2024-08-22T11:55:16.271Z",
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			metadata: {
				"@type": "https://www.w3.org/ns/activitystreams#Create",
				"https://www.w3.org/ns/activitystreams#actor": {
					"@id": "acct:person@example.org",
					"@type": "https://www.w3.org/ns/activitystreams#Person",
					"https://www.w3.org/ns/activitystreams#name": "Person"
				},
				"https://www.w3.org/ns/activitystreams#object": {
					"@type": "https://www.w3.org/ns/activitystreams#Note",
					"https://www.w3.org/ns/activitystreams#content": "This is a simple note 2"
				},
				"https://www.w3.org/ns/activitystreams#published": {
					"@type": "http://www.w3.org/2001/XMLSchema#dateTime",
					"@value": "2015-01-25T12:34:56Z"
				}
			},
			nodeIdentity: TEST_NODE_IDENTITY,
			updated: "2024-08-22T11:56:56.272Z"
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
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			aliases: [
				{ id: "foo123", created: FIRST_TICK },
				{ id: "bar456", created: FIRST_TICK }
			],
			changesets: [
				{
					hash: "Ht6zFJi0yl+MYTKgk+HdZW1PLWjJmSOwOkqrAA1NfVU=",
					signature:
						"Upe1JYPqtP0FQ56xYwB5WFlR3CsyQKke55KTRmn0/waQm6/OWCz+HJlfDYR4EuMthR8NHAixrl2iweYLHZ1xAg==",
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{
							op: "add",
							path: "/aliases",
							value: [
								{ id: "foo123", created: FIRST_TICK },
								{ id: "bar456", created: FIRST_TICK }
							]
						}
					]
				}
			],
			verified: true,
			verification: [{ created: FIRST_TICK }]
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
			entities: [
				{
					id: "0404040404040404040404040404040404040404040404040404040404040404",
					created: SECOND_TICK,
					updated: SECOND_TICK
				},
				{
					id: "0101010101010101010101010101010101010101010101010101010101010101",
					created: FIRST_TICK,
					updated: FIRST_TICK
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
			entities: [
				{
					id: "0404040404040404040404040404040404040404040404040404040404040404",
					created: SECOND_TICK,
					updated: SECOND_TICK,
					aliases: [
						{ id: "foo456", created: SECOND_TICK },
						{ id: "bar456", created: SECOND_TICK }
					]
				},
				{
					id: "0101010101010101010101010101010101010101010101010101010101010101",
					created: FIRST_TICK,
					updated: FIRST_TICK,
					aliases: [
						{ id: "foo123", created: FIRST_TICK },
						{ id: "bar123", created: FIRST_TICK }
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
			entities: [
				{
					id: "0404040404040404040404040404040404040404040404040404040404040404",
					created: SECOND_TICK,
					updated: SECOND_TICK
				},
				{
					id: "0101010101010101010101010101010101010101010101010101010101010101",
					created: FIRST_TICK,
					updated: FIRST_TICK,
					aliases: [{ id: "foo4", created: FIRST_TICK }]
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
			entities: [
				{
					id: "0404040404040404040404040404040404040404040404040404040404040404",
					created: SECOND_TICK,
					updated: SECOND_TICK
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
			entities: [
				{
					id: "0101010101010101010101010101010101010101010101010101010101010101",
					created: FIRST_TICK,
					updated: FIRST_TICK,
					aliases: [
						{
							id: "foo4",
							created: FIRST_TICK
						}
					]
				}
			]
		});
	});

	test("Can create a vertex with some metadata and a valid schema", async () => {
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
			created: FIRST_TICK,
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadata: {
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
			hash: "+b1f6l+JkK6vJYOmk84EExH5mxV1lqY5QJ/L+D7UWsk=",
			signature:
				"Jgvd1FjWd0VsQdkkqzxaByLkkCCDVuQtDEtskD6o3ZhxZfDx5towOGbYtHc8vz9cj8/v8NED+iBVFSjtHgugCQ==",
			vertexId: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			userIdentity: TEST_USER_IDENTITY,
			patches: [
				{
					op: "add",
					path: "/metadata",
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

		expect(immutableIntegrity.signature).toEqual(
			"Jgvd1FjWd0VsQdkkqzxaByLkkCCDVuQtDEtskD6o3ZhxZfDx5towOGbYtHc8vz9cj8/v8NED+iBVFSjtHgugCQ=="
		);

		expect(immutableIntegrity.integrity).toEqual({
			patches: [
				{
					op: "add",
					path: "/metadata",
					value: {
						"@context": "https://www.w3.org/ns/activitystreams",
						"@type": "Create",
						actor: { "@id": "acct:person@example.org", "@type": "Person", name: "Person" },
						object: { "@type": "Note", content: "This is a simple note 2" },
						published: "2015-01-25T12:34:56Z"
					}
				}
			]
		});
	});
});
