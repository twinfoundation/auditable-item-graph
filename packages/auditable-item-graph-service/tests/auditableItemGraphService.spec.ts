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
import {
	decodeJwtToIntegrity,
	setupTestEnv,
	TEST_NODE_IDENTITY,
	TEST_USER_IDENTITY
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

		EntityStorageConnectorFactory.register("auditable-item-graph-vertex", () => vertexStorage);

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
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [],
					hash: "5/QKaqyMYylY+/GwpcSHopUw9tSeIK3tYSNNoMuYwjw=",
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
			"khjWjRusY7cpGQb93waFkgUpzfsI1ynoCVc8JB/jqkxHnSKmPdheW9pDkGkslrVsbE5dGdpwD3wOfemSp8n8Dw=="
		);
		expect(integrity.userIdentity).toEqual(TEST_USER_IDENTITY);
		expect(integrity.patches).toEqual([]);
	});

	test("Can create a vertex with an alias", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			undefined,
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
			],
			changesets: [
				{
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
			"Upe1JYPqtP0FQ56xYwB5WFlR3CsyQKke55KTRmn0/waQm6/OWCz+HJlfDYR4EuMthR8NHAixrl2iweYLHZ1xAg=="
		);

		expect(integrity).toEqual({
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
			"TestSchema",
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
			metadataSchema: "TestSchema",
			metadata: {
				description: "This is a test",
				counter: 123
			},
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{
							op: "add",
							path: "/metadataSchema",
							value: "TestSchema"
						},
						{
							op: "add",
							path: "/metadata",
							value: {
								description: "This is a test",
								counter: 123
							}
						}
					],
					hash: "Ioou22vvlnk7Bj/56W0/ZLx+siCwV7dToRLtP6a06gk=",
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
			"lkGbJNHiwrJfbbfJyVmp6rSgY4IHujveyr/QmaZuYzeQLMtEuDGtHyJfMtyxS4ggaDiEZaJTE7ijLb68aX/2CQ=="
		);

		expect(integrity).toEqual({
			patches: [
				{
					op: "add",
					path: "/metadataSchema",
					value: "TestSchema"
				},
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
			"TestSchema",
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
			metadataSchema: "TestSchema",
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
			"TestSchema",
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
			metadataSchema: "TestSchema",
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
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{
							op: "add",
							path: "/metadataSchema",
							value: "TestSchema"
						},
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
					hash: "nB3V/1VjvkUfXWxfNedAbrjGIwGI2T/z33ESGsSuQJ0=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				}
			]
		});
	});

	test("Can get a vertex include changesets and verify current signature", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			"TestSchema",
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
			verifySignatureDepth: "current"
		});

		expect(result.verified).toEqual(true);
		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: FIRST_TICK,
			nodeIdentity: TEST_NODE_IDENTITY,
			metadataSchema: "TestSchema",
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
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity: TEST_USER_IDENTITY,
					patches: [
						{
							op: "add",
							path: "/metadataSchema",
							value: "TestSchema"
						},
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
					hash: "nB3V/1VjvkUfXWxfNedAbrjGIwGI2T/z33ESGsSuQJ0=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				}
			]
		});
	});

	test("Can create and update with no changes and verify", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			"TestSchema",
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
			"TestSchema",
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
			verifySignatureDepth: "current"
		});

		expect(result.verified).toEqual(true);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: FIRST_TICK,
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			metadataSchema: "TestSchema",
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
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
					patches: [
						{
							op: "add",
							path: "/metadataSchema",
							value: "TestSchema"
						},
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
					hash: "nB3V/1VjvkUfXWxfNedAbrjGIwGI2T/z33ESGsSuQJ0=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				}
			]
		});
	});

	test("Can create and update and verify aliases", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			"TestSchema",
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
			"TestSchema",
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
			verifySignatureDepth: "all"
		});

		expect(result.verified).toEqual(true);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: SECOND_TICK,
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			metadataSchema: "TestSchema",
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
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
					patches: [
						{
							op: "add",
							path: "/metadataSchema",
							value: "TestSchema"
						},
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
					hash: "nB3V/1VjvkUfXWxfNedAbrjGIwGI2T/z33ESGsSuQJ0=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
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
					hash: "2W+tlN6AQPd2vGVmKywUGvDKWGkuM9rtoHWmNOHRisM=",
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
			"jRhXXJbjwH1ROx24un1bsC9o4ksWlWUT8VWsmAmIggXCtEvmd66I2N3ZjWA6qcDFHxq0Eg8Sf6o3iVb7B/1pCg=="
		);

		expect(credentialSignature.integrity).toEqual({
			patches: [
				{
					op: "add",
					path: "/metadataSchema",
					value: "TestSchema"
				},
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
			"riFe1gRo3ASM+ig9EAn573vE61Kwi+nOCvV0zq/5u43EDDEvE9QOOKIN0vxn187nTh30aYfEx4ky3+SYYW7oAw=="
		);

		expect(credentialSignature.integrity).toEqual({
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
			"TestSchema",
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
			"TestSchema",
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
			verifySignatureDepth: "all"
		});

		expect(result.verified).toEqual(true);
		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: SECOND_TICK,
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			metadataSchema: "TestSchema",
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
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
					patches: [
						{
							op: "add",
							path: "/metadataSchema",
							value: "TestSchema"
						},
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
					hash: "nB3V/1VjvkUfXWxfNedAbrjGIwGI2T/z33ESGsSuQJ0=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
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
					hash: "N5sb3hFYXdqtyNHVa7LYxpsz/dIwZrcgvMBio32DETE=",
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
			"jRhXXJbjwH1ROx24un1bsC9o4ksWlWUT8VWsmAmIggXCtEvmd66I2N3ZjWA6qcDFHxq0Eg8Sf6o3iVb7B/1pCg=="
		);

		expect(credentialSignature.integrity).toEqual({
			patches: [
				{
					op: "add",
					path: "/metadataSchema",
					value: "TestSchema"
				},
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
			"zFGn5sxj+1VH/ky7FAKBAgjCg7imtwbwOPXrDPoF4p9DXll/55nv3mEKEkx284A2ooloXSBM7MlkZbCVABz6BQ=="
		);

		expect(credentialSignature.integrity).toEqual({
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
			"TestSchema",
			{
				description: "This is a test",
				counter: 123
			},
			[{ id: "foo123" }, { id: "bar456" }],
			[
				{
					id: "resource1",
					metadataSchema: "TestSchemaRes",
					metadata: {
						resDescription: "This is a test",
						resCounter: 123
					}
				},
				{
					id: "resource2",
					metadataSchema: "TestSchemaRes",
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
			"TestSchema",
			{
				title: "Title",
				counter: 456
			},
			[{ id: "foo123" }, { id: "bar456" }],
			[
				{
					id: "resource1",
					metadataSchema: "TestSchemaRes",
					metadata: {
						resTitle: "Title",
						resCounter: 456
					}
				},
				{
					id: "resource2",
					metadataSchema: "TestSchemaRes",
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
			verifySignatureDepth: "all"
		});

		expect(result.verified).toEqual(true);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: SECOND_TICK,
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			metadataSchema: "TestSchema",
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
					metadataSchema: "TestSchemaRes",
					metadata: {
						resTitle: "Title",
						resCounter: 456
					}
				},
				{
					id: "resource2",
					created: FIRST_TICK,
					metadataSchema: "TestSchemaRes",
					metadata: {
						resTitle: "Title",
						resCounter: 456
					}
				}
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
					patches: [
						{
							op: "add",
							path: "/metadataSchema",
							value: "TestSchema"
						},
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
									metadataSchema: "TestSchemaRes",
									metadata: {
										resDescription: "This is a test",
										resCounter: 123
									}
								},
								{
									id: "resource2",
									created: FIRST_TICK,
									metadataSchema: "TestSchemaRes",
									metadata: {
										resDescription: "This is a test2",
										resCounter: 456
									}
								}
							]
						}
					],
					hash: "Q74F7K0Uv1dX0ty5QkwhQarr3XFT7MLkqavHyYZsrBI=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
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
					hash: "FqfkQhKG7abCegPv9qoxkHnxALiR+DapDvXPxZfImbM=",
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
			"mK7HUl2VBYAQyjKPomUos8goPa+DjoRzHiVovt9pOd1x/6IW88FSl1y96Z2UM1UQ88r6QpbmS5vxKbemGZVNDg=="
		);

		expect(credentialSignature.integrity).toEqual({
			patches: [
				{
					op: "add",
					path: "/metadataSchema",
					value: "TestSchema"
				},
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
							metadataSchema: "TestSchemaRes",
							metadata: {
								resDescription: "This is a test",
								resCounter: 123
							}
						},
						{
							id: "resource2",
							created: FIRST_TICK,
							metadataSchema: "TestSchemaRes",
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
			"0i3ST9bbvd8doZPTo7rjw+83Qfnxhc7nXJ35sZlz2+AdfXOSIwbxJviBAw+oPapF6yNKYZX4eoBVk2FeShuoBQ=="
		);

		expect(credentialSignature.integrity).toEqual({
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
			undefined,
			[
				{
					id: "edge1",
					relationship: "friend",
					metadataSchema: "TestSchemaEdge",
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
			undefined,
			[
				{
					id: "edge1",
					relationship: "frenemy",
					metadataSchema: "TestSchemaEdge",
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
			verifySignatureDepth: "all"
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
					metadataSchema: "TestSchemaEdge",
					metadata: {
						title: "Title",
						counter: 456
					}
				}
			],
			changesets: [
				{
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
									metadataSchema: "TestSchemaEdge",
									metadata: {
										description: "This is a test",
										counter: 123
									},
									relationship: "friend"
								}
							]
						}
					],
					hash: "MNWLDkruJt3R/71dZblH4AOvIzTKvlCaZqNro5ImN6M=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
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
					hash: "Uto3Cy9H1Z2ektgzz/Fh312HWl8rbwSHEBEsR5NCygI=",
					immutableStorageId:
						"immutable:entity-storage:0505050505050505050505050505050505050505050505050505050505050505"
				}
			]
		});
	});

	test("Can create and update and verify aliases, metadata, resources and edges", async () => {
		const service = new AuditableItemGraphService({ config: { enableIntegrityCheck: true } });
		const id = await service.create(
			"TestSchema",
			{
				description: "This is a test",
				counter: 123
			},
			[
				{
					id: "foo123",
					metadataSchema: "TestSchemaAlias",
					metadata: {
						aliasDescription: "This is a test",
						aliasCounter: 123
					}
				},
				{
					id: "bar456",
					metadataSchema: "TestSchemaAlias",
					metadata: {
						aliasDescription: "This is a test",
						aliasCounter: 123
					}
				}
			],
			[
				{
					id: "resource1",
					metadataSchema: "TestSchemaRes",
					metadata: {
						resDescription: "This is a test",
						resCounter: 123
					}
				},
				{
					id: "resource2",
					metadataSchema: "TestSchemaRes",
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
					metadataSchema: "TestSchemaEdge",
					metadata: {
						edgeDescription: "This is a test",
						edgeCounter: 123
					}
				},
				{
					id: "edge2",
					relationship: "enemy",
					metadataSchema: "TestSchemaEdge",
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
			"TestSchema",
			{
				title: "Title",
				counter: 123
			},
			[
				{
					id: "foo123",
					metadataSchema: "TestSchemaAlias",
					metadata: {
						aliasTitle: "Title",
						aliasCounter: 123
					}
				},
				{
					id: "bar456",
					metadataSchema: "TestSchemaAlias",
					metadata: {
						aliasTitle: "Title",
						aliasCounter: 123
					}
				}
			],
			[
				{
					id: "resource1",
					metadataSchema: "TestSchemaRes",
					metadata: {
						resTitle: "Title",
						resCounter: 123
					}
				},
				{
					id: "resource2",
					metadataSchema: "TestSchemaRes",
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
					metadataSchema: "TestSchemaEdge",
					metadata: {
						edgeTitle: "Title",
						edgeCounter: 123
					}
				},
				{
					id: "edge2",
					relationship: "enemy",
					metadataSchema: "TestSchemaEdge",
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
			verifySignatureDepth: "all"
		});

		expect(result.verified).toEqual(true);

		expect(result.vertex).toEqual({
			id: "0101010101010101010101010101010101010101010101010101010101010101",
			created: FIRST_TICK,
			updated: SECOND_TICK,
			nodeIdentity:
				"did:entity-storage:0x6363636363636363636363636363636363636363636363636363636363636363",
			metadataSchema: "TestSchema",
			metadata: {
				title: "Title",
				counter: 123
			},
			aliases: [
				{
					id: "foo123",
					created: FIRST_TICK,
					metadataSchema: "TestSchemaAlias",
					metadata: {
						aliasTitle: "Title",
						aliasCounter: 123
					}
				},
				{
					id: "bar456",
					created: FIRST_TICK,
					metadataSchema: "TestSchemaAlias",
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
					metadataSchema: "TestSchemaRes",
					metadata: {
						resTitle: "Title",
						resCounter: 123
					}
				},
				{
					id: "resource2",
					created: FIRST_TICK,
					metadataSchema: "TestSchemaRes",
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
					metadataSchema: "TestSchemaEdge",
					metadata: {
						edgeTitle: "Title",
						edgeCounter: 123
					}
				},
				{
					id: "edge2",
					created: FIRST_TICK,
					relationship: "enemy",
					metadataSchema: "TestSchemaEdge",
					metadata: {
						edgeTitle: "Title",
						edgeCounter: 456
					}
				}
			],
			changesets: [
				{
					created: FIRST_TICK,
					userIdentity:
						"did:entity-storage:0x5858585858585858585858585858585858585858585858585858585858585858",
					patches: [
						{
							op: "add",
							path: "/metadataSchema",
							value: "TestSchema"
						},
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
									metadataSchema: "TestSchemaAlias",
									metadata: {
										aliasDescription: "This is a test",
										aliasCounter: 123
									}
								},
								{
									id: "bar456",
									created: FIRST_TICK,
									metadataSchema: "TestSchemaAlias",
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
									metadataSchema: "TestSchemaRes",
									metadata: {
										resDescription: "This is a test",
										resCounter: 123
									}
								},
								{
									id: "resource2",
									created: FIRST_TICK,
									metadataSchema: "TestSchemaRes",
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
									metadataSchema: "TestSchemaEdge",
									metadata: {
										edgeDescription: "This is a test",
										edgeCounter: 123
									},
									relationship: "friend"
								},
								{
									id: "edge2",
									created: FIRST_TICK,
									metadataSchema: "TestSchemaEdge",
									metadata: {
										edgeDescription: "This is a test2",
										edgeCounter: 456
									},
									relationship: "enemy"
								}
							]
						}
					],
					hash: "h7oXSBfag62pdqwHOj5C2L1bTu3dJzH+XroWfHz4yC4=",
					immutableStorageId:
						"immutable:entity-storage:0303030303030303030303030303030303030303030303030303030303030303"
				},
				{
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
					hash: "2paJOt97iJxl/7ws5XPYzAjxHQWCUclHHBOHVKNS6Ng=",
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
			"ciZX+HNgx9X3t+a8rymK5fx89bbrxjZJQlCGKDYSqaICw60YDtJEEdKQzp1F3JstLnF4QrHHEn2bCs0RHRraDw=="
		);

		expect(credentialSignature.integrity).toEqual({
			patches: [
				{
					op: "add",
					path: "/metadataSchema",
					value: "TestSchema"
				},
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
							metadataSchema: "TestSchemaAlias",
							metadata: {
								aliasDescription: "This is a test",
								aliasCounter: 123
							}
						},
						{
							id: "bar456",
							created: FIRST_TICK,
							metadataSchema: "TestSchemaAlias",
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
							metadataSchema: "TestSchemaRes",
							metadata: {
								resDescription: "This is a test",
								resCounter: 123
							}
						},
						{
							id: "resource2",
							created: FIRST_TICK,
							metadataSchema: "TestSchemaRes",
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
							metadataSchema: "TestSchemaEdge",
							metadata: {
								edgeDescription: "This is a test",
								edgeCounter: 123
							},
							relationship: "friend"
						},
						{
							id: "edge2",
							created: FIRST_TICK,
							metadataSchema: "TestSchemaEdge",
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
			"gMA9etTTMAQmr76YqIWtJSffF4JWcqE4xNgVZ5sQj97brqL48Ucq1EYvFiafD4iylVxEG7zCgSpYI/0uMYL5BA=="
		);

		expect(credentialSignature.integrity).toEqual({
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

		const vertex = await service.get(id, { includeChangesets: true, verifySignatureDepth: "all" });

		expect(vertex).toEqual({
			verified: true,
			verification: {
				[FIRST_TICK]: {
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
				}
			},
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
				],
				changesets: [
					{
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
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create(
			undefined,
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
			undefined,
			[{ id: "foo123" }, { id: "bar123" }],
			undefined,
			undefined,
			TEST_USER_IDENTITY,
			TEST_NODE_IDENTITY
		);
		await service.create(
			undefined,
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
});
