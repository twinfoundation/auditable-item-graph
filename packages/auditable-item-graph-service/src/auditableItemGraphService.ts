// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuditableItemGraphProperty,
	IAuditableItemGraphAlias,
	IAuditableItemGraphComponent,
	IAuditableItemGraphVertex,
	IAuditableItemGraphResource,
	IAuditableItemGraphEdge
} from "@gtsc/auditable-item-graph-models";
import {
	Converter,
	GeneralError,
	Guards,
	Is,
	NotFoundError,
	ObjectHelper,
	RandomHelper,
	Urn
} from "@gtsc/core";
import { Blake2b } from "@gtsc/crypto";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@gtsc/entity-storage-models";
import {
	ImmutableStorageConnectorFactory,
	type IImmutableStorageConnector
} from "@gtsc/immutable-storage-models";
import { nameof } from "@gtsc/nameof";
import type { IProperty } from "@gtsc/schema";
import { VaultConnectorFactory, type IVaultConnector } from "@gtsc/vault-models";
import type { AuditableItemGraphProperty } from "./entities/auditableItemGraphProperty";
import type { AuditableItemGraphVertex } from "./entities/auditableItemGraphVertex";
import type { IAuditableItemGraphServiceConfig } from "./models/IAuditableItemGraphServiceConfig";
import type { IAuditableItemGraphServiceContext } from "./models/IAuditableItemGraphServiceContext";
import type { IAuditableItemGraphMetadataElement } from "../../auditable-item-graph-models/dist/types/models/IAuditableItemGraphMetadataElement";

/**
 * Class for performing auditable item graph operations.
 */
export class AuditableItemGraphService implements IAuditableItemGraphComponent {
	/**
	 * The namespace for the service.
	 */
	public static readonly NAMESPACE: string = "aig";

	/**
	 * The keys to use from an alias to generate signature.
	 * @internal
	 */
	private static readonly _ALIAS_KEYS: (keyof IAuditableItemGraphAlias)[] = ["id", "created"];

	/**
	 * The keys to use from a resource to generate signature.
	 * @internal
	 */
	private static readonly _RESOURCE_KEYS: (keyof IAuditableItemGraphResource)[] = ["id", "created"];

	/**
	 * The keys to use from a edge to generate signature.
	 * @internal
	 */
	private static readonly _EDGE_KEYS: (keyof IAuditableItemGraphEdge)[] = [
		"id",
		"created",
		"relationship"
	];

	/**
	 * The keys to use from a metadata property to generate signature.
	 * @internal
	 */
	private static readonly _METADATA_PROPERTY_KEYS: (keyof IAuditableItemGraphProperty)[] = [
		"id",
		"created",
		"type",
		"value"
	];

	/**
	 * Runtime name for the class.
	 */
	public readonly CLASS_NAME: string = nameof<AuditableItemGraphService>();

	/**
	 * The configuration for the connector.
	 * @internal
	 */
	private readonly _config: IAuditableItemGraphServiceConfig;

	/**
	 * The vault connector.
	 * @internal
	 */
	private readonly _vaultConnector: IVaultConnector;

	/**
	 * The entity storage for vertices.
	 * @internal
	 */
	private readonly _vertexStorage: IEntityStorageConnector<AuditableItemGraphVertex>;

	/**
	 * The immutable storage for the audit trail.
	 * @internal
	 */
	private readonly _auditTrailImmutableStorage: IImmutableStorageConnector;

	/**
	 * The vault key for signing the data.
	 * @internal
	 */
	private readonly _vaultSigningKeyId: string;

	/**
	 * Create a new instance of AuditableItemGraphService.
	 * @param options The dependencies for the auditable item graph connector.
	 * @param options.config The configuration for the connector.
	 * @param options.vaultConnectorType The vault connector type, defaults to "vault".
	 * @param options.vertexEntityStorageType The entity storage for vertices, defaults to "vertex".
	 * @param options.immutableStorageType The immutable storage for audit trail, defaults to "audit-trail".
	 */
	constructor(options?: {
		vaultConnectorType?: string;
		vertexEntityStorageType?: string;
		immutableStorageType?: string;
		config?: IAuditableItemGraphServiceConfig;
	}) {
		this._vaultConnector = VaultConnectorFactory.get(options?.vaultConnectorType ?? "vault");

		this._vertexStorage = EntityStorageConnectorFactory.get(
			options?.vertexEntityStorageType ?? "vertex"
		);

		this._auditTrailImmutableStorage = ImmutableStorageConnectorFactory.get(
			options?.immutableStorageType ?? "audit-trail"
		);

		this._config = options?.config ?? {};
		this._vaultSigningKeyId = this._config.vaultSigningKeyId ?? "auditable-item-graph";
	}

	/**
	 * Create a new graph vertex.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param metadata The metadata for the vertex.
	 * @param identity The identity to create the auditable item graph operation with.
	 * @param nodeIdentity The node identity to include in the auditable item graph.
	 * @returns The id of the new graph item.
	 */
	public async create(
		aliases?: string[],
		metadata?: IProperty[],
		identity?: string,
		nodeIdentity?: string
	): Promise<string> {
		Guards.stringValue(this.CLASS_NAME, nameof(identity), identity);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		try {
			const id = Converter.bytesToHex(RandomHelper.generate(32), false);

			const now = Date.now();

			const changes: unknown[] = [];

			const vertex: IAuditableItemGraphVertex = {
				id,
				nodeIdentity,
				created: now
			};

			const context: IAuditableItemGraphServiceContext = {
				now,
				identity,
				nodeIdentity,
				changes
			};

			if (Is.arrayValue(aliases)) {
				for (const alias of aliases) {
					await this.addAlias(context, vertex, alias);
				}
			}

			if (Is.arrayValue(metadata)) {
				for (const meta of metadata) {
					await this.addMetadata(context, vertex, meta);
				}
			}

			await this.addChangeset(context, vertex, changes);

			await this._vertexStorage.set(this.vertexModelToEntity(vertex));

			return new Urn(AuditableItemGraphService.NAMESPACE, id).toString();
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "createFailed", undefined, error);
		}
	}

	/**
	 * Get a graph vertex.
	 * @param id The id of the vertex to get.
	 * @returns The vertex if found.
	 * @param options Additional options for the get operation.
	 * @param options.includeDeleted Whether to include deleted aliases, resource, edges, defaults to false.
	 * @param options.includeChangesets Whether to include the changesets of the vertex, defaults to false.
	 * @param options.verifySignatureDepth How many signatures to verify, defaults to "none".
	 * @throws NotFoundError if the vertex is not found.
	 */
	public async get(
		id: string,
		options?: {
			includeDeleted?: boolean;
			includeChangesets?: boolean;
			verifySignatureDepth?: "none" | "current" | "all";
		}
	): Promise<IAuditableItemGraphVertex> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemGraphService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemGraphService.NAMESPACE,
				id
			});
		}

		try {
			const vertexId = urnParsed.namespaceSpecific(0);
			const vertex = await this._vertexStorage.get(vertexId);

			if (Is.empty(vertex)) {
				throw new NotFoundError(this.CLASS_NAME, "vertexNotFound", id);
			}

			const model = this.vertexEntityToModel(vertex);

			if (options?.verifySignatureDepth === "current" || options?.verifySignatureDepth === "all") {
				await this.verifyChangesets(model, options.verifySignatureDepth);
			}

			if (!(options?.includeDeleted ?? false)) {
				if (Is.arrayValue(model.metadata)) {
					model.metadata = model.metadata.filter(a => Is.undefined(a.deleted));
					if (model.metadata.length === 0) {
						delete model.metadata;
					}
				}
				if (Is.arrayValue(model.aliases)) {
					model.aliases = model.aliases.filter(a => Is.undefined(a.deleted));
					if (model.aliases.length === 0) {
						delete model.aliases;
					}
				}
				if (Is.arrayValue(model.resources)) {
					model.resources = model.resources.filter(r => Is.undefined(r.deleted));
					if (model.resources.length === 0) {
						delete model.resources;
					} else {
						for (const resource of model.resources) {
							if (Is.arrayValue(resource.metadata)) {
								resource.metadata = resource.metadata.filter(m => Is.undefined(m.deleted));
								if (resource.metadata.length === 0) {
									delete resource.metadata;
								}
							}
						}
					}
				}
				if (Is.arrayValue(model.edges)) {
					model.edges = model.edges.filter(r => Is.undefined(r.deleted));
					if (model.edges.length === 0) {
						delete model.edges;
					} else {
						for (const edge of model.edges) {
							if (Is.arrayValue(edge.metadata)) {
								edge.metadata = edge.metadata.filter(m => Is.undefined(m.deleted));
								if (edge.metadata.length === 0) {
									delete edge.metadata;
								}
							}
						}
					}
				}
			}

			if (!(options?.includeChangesets ?? false)) {
				delete model.changesets;
			}

			return model;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "getFailed", undefined, error);
		}
	}

	/**
	 * Map the vertex model to an entity.
	 * @param vertex The vertex model.
	 * @returns The entity.
	 * @internal
	 */
	private vertexModelToEntity(vertex: IAuditableItemGraphVertex): AuditableItemGraphVertex {
		const entity: AuditableItemGraphVertex = {
			id: vertex.id,
			created: vertex.created,
			nodeIdentity: vertex.nodeIdentity,
			metadata: this.metadataModelToEntity(vertex.metadata)
		};

		if (Is.arrayValue(vertex.aliases)) {
			entity.aliases ??= [];
			for (const alias of vertex.aliases) {
				entity.aliases.push({
					id: alias.id,
					created: alias.created,
					deleted: alias.deleted
				});
			}
		}

		if (Is.arrayValue(vertex.resources)) {
			entity.resources ??= [];
			for (const resource of vertex.resources) {
				entity.resources.push({
					id: resource.id,
					created: resource.created,
					deleted: resource.deleted,
					metadata: this.metadataModelToEntity(resource.metadata)
				});
			}
		}

		if (Is.arrayValue(vertex.edges)) {
			entity.edges ??= [];
			for (const edge of vertex.edges) {
				entity.edges.push({
					id: edge.id,
					created: edge.created,
					deleted: edge.deleted,
					relationship: edge.relationship,
					metadata: this.metadataModelToEntity(edge.metadata)
				});
			}
		}

		if (Is.arrayValue(vertex.changesets)) {
			entity.changesets ??= [];
			for (const changeset of vertex.changesets) {
				entity.changesets.push({
					created: changeset.created,
					identity: changeset.identity,
					hash: changeset.hash,
					immutableStorageId: changeset.immutableStorageId
				});
			}
		}

		return entity;
	}

	/**
	 * Map the metadata model to an entity.
	 * @param metadata The metadata models.
	 * @returns The metadata entities.
	 * @internal
	 */
	private metadataModelToEntity(metadata?: IAuditableItemGraphProperty[] | undefined):
		| {
				[id: string]: AuditableItemGraphProperty;
		  }
		| undefined {
		let entity: { [id: string]: AuditableItemGraphProperty } | undefined;

		if (Is.arrayValue(metadata)) {
			entity = {};
			for (const metadataElement of metadata) {
				entity[metadataElement.id] = {
					type: metadataElement.type,
					value: metadataElement.value,
					created: metadataElement.created,
					deleted: metadataElement.deleted
				};
			}
		}

		return entity;
	}

	/**
	 * Map the vertex entity to a model.
	 * @param vertex The vertex entity.
	 * @returns The model.
	 * @internal
	 */
	private vertexEntityToModel(vertex: AuditableItemGraphVertex): IAuditableItemGraphVertex {
		const model: IAuditableItemGraphVertex = {
			id: vertex.id,
			created: vertex.created,
			nodeIdentity: vertex.nodeIdentity,
			metadata: this.metadataEntityToModel(vertex.metadata)
		};

		if (Is.arrayValue(vertex.aliases)) {
			model.aliases ??= [];
			for (const alias of vertex.aliases) {
				model.aliases.push({
					id: alias.id,
					created: alias.created,
					deleted: alias.deleted
				});
			}
		}

		if (Is.arrayValue(vertex.resources)) {
			for (const resource of vertex.resources) {
				model.resources ??= [];
				model.resources.push({
					id: resource.id,
					created: resource.created,
					deleted: resource.deleted,
					metadata: this.metadataEntityToModel(resource.metadata)
				});
			}
		}

		if (Is.arrayValue(vertex.edges)) {
			for (const edge of vertex.edges) {
				model.edges ??= [];
				model.edges.push({
					id: edge.id,
					created: edge.created,
					deleted: edge.deleted,
					relationship: edge.relationship,
					metadata: this.metadataEntityToModel(edge.metadata)
				});
			}
		}

		if (Is.arrayValue(vertex.changesets)) {
			for (const changeset of vertex.changesets) {
				model.changesets ??= [];
				model.changesets.push({
					created: changeset.created,
					identity: changeset.identity,
					hash: changeset.hash,
					immutableStorageId: changeset.immutableStorageId
				});
			}
		}

		return model;
	}

	/**
	 * Map the metadata model to an entity.
	 * @param metadata The vertex model.
	 * @param includeDeleted Whether to include deleted metadata.
	 * @returns The entity.
	 * @internal
	 */
	private metadataEntityToModel(
		metadata:
			| {
					[id: string]: AuditableItemGraphProperty;
			  }
			| undefined
	): IAuditableItemGraphProperty[] | undefined {
		let models: IAuditableItemGraphProperty[] | undefined;

		if (Is.objectValue(metadata)) {
			for (const id in metadata) {
				models ??= [];
				models.push({
					id,
					type: metadata[id].type,
					value: metadata[id].value,
					created: metadata[id].created,
					deleted: metadata[id].deleted
				});
			}
		}

		return models;
	}

	/**
	 * Add an alias to the vertex model.
	 * @param context The context for the operation.
	 * @param vertex The vertex model.
	 * @param alias The alias.
	 * @internal
	 */
	private async addAlias(
		context: IAuditableItemGraphServiceContext,
		vertex: IAuditableItemGraphVertex,
		alias: string
	): Promise<void> {
		vertex.aliases ??= [];

		const graphAlias: IAuditableItemGraphAlias = {
			id: alias,
			created: context.now
		};

		vertex.aliases.push(graphAlias);

		context.changes.push(ObjectHelper.pick(graphAlias, AuditableItemGraphService._ALIAS_KEYS));
	}

	/**
	 * Add an alias to the vertex model.
	 * @param context The context for the operation.
	 * @param metadataElement The vertex model.
	 * @param metadata The metadata to add.
	 * @param signatureKeys The keys to use for signature generation.
	 * @internal
	 */
	private async addMetadata<T extends IAuditableItemGraphMetadataElement>(
		context: IAuditableItemGraphServiceContext,
		metadataElement: T,
		metadata: IProperty
	): Promise<void> {
		metadataElement.metadata ??= [];

		// Try to find an existing metadata item which is still active.
		const existing = metadataElement.metadata.find(
			m => m.id === metadata.key && Is.undefined(m.deleted)
		);

		const modelProperty: IAuditableItemGraphProperty = {
			id: metadata.key,
			created: context.now,
			type: metadata.type,
			value: metadata.value
		};
		metadataElement.metadata.push(modelProperty);

		context.changes.push(
			ObjectHelper.pick(modelProperty, AuditableItemGraphService._METADATA_PROPERTY_KEYS)
		);

		// If there was an existing metadata item, mark it as deleted.
		if (!Is.empty(existing)) {
			existing.deleted = context.now;
		}
	}

	/**
	 * Add a changeset to the vertex and generate the associated verifications.
	 * @param context The context for the operation.
	 * @param vertex The vertex model.
	 * @param changes The changes to add to a new changeset.
	 * @internal
	 */
	private async addChangeset(
		context: IAuditableItemGraphServiceContext,
		vertex: IAuditableItemGraphVertex,
		changes: unknown[]
	): Promise<void> {
		const changeSets = vertex.changesets ?? [];

		const b2b = new Blake2b(Blake2b.SIZE_256);

		// If there are previous changesets, add the most recent one to the new hash.
		// This provides a link to previous integrity checks.
		if (changeSets.length > 0) {
			b2b.update(Converter.base64ToBytes(changeSets[changeSets.length - 1].hash));
		}

		// Add the epoch and the identity in to the signature
		b2b.update(Converter.utf8ToBytes(context.now.toString()));
		b2b.update(Converter.utf8ToBytes(context.identity));

		// Add the signature objects to the hash.
		for (const change of changes) {
			b2b.update(ObjectHelper.toBytes(change));
		}

		const changeSetHash = b2b.digest();

		// Generate the signature for the changeset using the hash.
		const signature = await this._vaultConnector.sign(
			`${context.nodeIdentity}/${this._vaultSigningKeyId}`,
			changeSetHash
		);

		// Store the signature immutably
		const immutableStorageId = await this._auditTrailImmutableStorage.store(
			context.nodeIdentity,
			signature
		);

		changeSets.push({
			created: context.now,
			identity: context.identity,
			hash: Converter.bytesToBase64(changeSetHash),
			immutableStorageId
		});

		vertex.changesets = changeSets;
	}

	/**
	 * Verify the changesets of a vertex.
	 * @param nodeIdentity The node identity to verify the changesets with.
	 * @param vertex The vertex to verify.
	 * @param verifySignatureDepth How many signatures to verify.
	 * @internal
	 * @throws GeneralError if the changesets are invalid.
	 */
	private async verifyChangesets(
		vertex: IAuditableItemGraphVertex,
		verifySignatureDepth: "current" | "all"
	): Promise<void> {
		// First convert the vertex data to a map based on the epochs
		const epochSignatureObjects: { [epoch: number]: unknown[] } = {};

		if (Is.arrayValue(vertex.aliases)) {
			for (const alias of vertex.aliases) {
				epochSignatureObjects[alias.created] ??= [];
				epochSignatureObjects[alias.created].push(
					ObjectHelper.pick(alias, AuditableItemGraphService._ALIAS_KEYS)
				);
			}
		}

		if (Is.arrayValue(vertex.metadata)) {
			for (const metadata of vertex.metadata) {
				epochSignatureObjects[metadata.created] ??= [];
				epochSignatureObjects[metadata.created].push(
					ObjectHelper.pick(metadata, AuditableItemGraphService._METADATA_PROPERTY_KEYS)
				);
			}
		}

		if (Is.arrayValue(vertex.resources)) {
			for (const resource of vertex.resources) {
				epochSignatureObjects[resource.created] ??= [];
				epochSignatureObjects[resource.created].push(
					ObjectHelper.pick(resource, AuditableItemGraphService._RESOURCE_KEYS)
				);

				if (Is.arrayValue(resource.metadata)) {
					for (const metadata of resource.metadata) {
						epochSignatureObjects[metadata.created] ??= [];
						epochSignatureObjects[metadata.created].push(
							ObjectHelper.pick(metadata, AuditableItemGraphService._METADATA_PROPERTY_KEYS)
						);
					}
				}
			}
		}

		if (Is.arrayValue(vertex.edges)) {
			for (const edge of vertex.edges) {
				epochSignatureObjects[edge.created] ??= [];
				epochSignatureObjects[edge.created].push(
					ObjectHelper.pick(edge, AuditableItemGraphService._EDGE_KEYS)
				);

				if (Is.arrayValue(edge.metadata)) {
					for (const metadata of edge.metadata) {
						epochSignatureObjects[metadata.created] ??= [];
						epochSignatureObjects[metadata.created].push(
							ObjectHelper.pick(metadata, AuditableItemGraphService._METADATA_PROPERTY_KEYS)
						);
					}
				}
			}
		}

		if (Is.arrayValue(vertex.changesets)) {
			let lastHash: Uint8Array | undefined;
			for (let i = 0; i < vertex.changesets.length; i++) {
				const changeset = vertex.changesets[i];
				const changes = epochSignatureObjects[changeset.created] ?? [];

				const b2b = new Blake2b(Blake2b.SIZE_256);
				// Add the last hash if there is one
				if (Is.uint8Array(lastHash)) {
					b2b.update(lastHash);
				}
				// Add the epoch and the identity in to the signature
				b2b.update(Converter.utf8ToBytes(changeset.created.toString()));
				b2b.update(Converter.utf8ToBytes(changeset.identity));

				// Add the signature objects to the hash.
				for (const change of changes) {
					b2b.update(ObjectHelper.toBytes(change));
				}
				const verifyHash = b2b.digest();

				if (Converter.bytesToBase64(verifyHash) !== changeset.hash) {
					throw new GeneralError(this.CLASS_NAME, "invalidChangesetHash", {
						epoch: changeset.created,
						hash: changeset.hash
					});
				}

				lastHash = verifyHash;

				if (
					verifySignatureDepth === "all" ||
					(verifySignatureDepth === "current" && i === vertex.changesets.length - 1)
				) {
					const signature = await this._vaultConnector.sign(
						`${vertex.nodeIdentity}/${this._vaultSigningKeyId}`,
						verifyHash
					);

					const immutableSignature = await this._auditTrailImmutableStorage.get(
						changeset.immutableStorageId
					);

					if (Converter.bytesToBase64(immutableSignature) !== Converter.bytesToBase64(signature)) {
						throw new GeneralError(this.CLASS_NAME, "invalidChangesetSignature", {
							epoch: changeset.created,
							hash: changeset.hash
						});
					}
				}
			}
		}
	}
}
