// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuditableItemGraphAlias,
	IAuditableItemGraphAuditedElement,
	IAuditableItemGraphChange,
	IAuditableItemGraphComponent,
	IAuditableItemGraphCredential,
	IAuditableItemGraphEdge,
	IAuditableItemGraphIntegrity,
	IAuditableItemGraphMetadataElement,
	IAuditableItemGraphProperty,
	IAuditableItemGraphResource,
	IAuditableItemGraphVertex,
	VerifyDepth
} from "@gtsc/auditable-item-graph-models";
import {
	Converter,
	GeneralError,
	Guards,
	Is,
	JsonHelper,
	NotFoundError,
	ObjectHelper,
	RandomHelper,
	Urn
} from "@gtsc/core";
import { Blake2b } from "@gtsc/crypto";
import { ComparisonOperator, LogicalOperator, SortDirection } from "@gtsc/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@gtsc/entity-storage-models";
import {
	DocumentHelper,
	IdentityConnectorFactory,
	type IIdentityConnector
} from "@gtsc/identity-models";
import {
	ImmutableStorageConnectorFactory,
	type IImmutableStorageConnector
} from "@gtsc/immutable-storage-models";
import { nameof } from "@gtsc/nameof";
import type { IProperty } from "@gtsc/schema";
import {
	VaultConnectorFactory,
	VaultEncryptionType,
	type IVaultConnector
} from "@gtsc/vault-models";
import { Jwt } from "@gtsc/web";
import type { AuditableItemGraphProperty } from "./entities/auditableItemGraphProperty";
import type { AuditableItemGraphVertex } from "./entities/auditableItemGraphVertex";
import type { IAuditableItemGraphServiceConfig } from "./models/IAuditableItemGraphServiceConfig";
import type { IAuditableItemGraphServiceContext } from "./models/IAuditableItemGraphServiceContext";

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
	 * The immutable storage for the integrity data.
	 * @internal
	 */
	private readonly _integrityImmutableStorage: IImmutableStorageConnector;

	/**
	 * The identity connector for generating verifiable credentials.
	 * @internal
	 */
	private readonly _identityConnector: IIdentityConnector;

	/**
	 * The vault key for signing or encrypting the data.
	 * @internal
	 */
	private readonly _vaultKeyId: string;

	/**
	 * The assertion method id to use for the graph.
	 * @internal
	 */
	private readonly _assertionMethodId: string;

	/**
	 * Enable immutable integrity checking by storing the changes encrypted in immutable storage.
	 * @internal
	 */
	private readonly _enableIntegrityCheck: boolean;

	/**
	 * Create a new instance of AuditableItemGraphService.
	 * @param options The dependencies for the auditable item graph connector.
	 * @param options.config The configuration for the connector.
	 * @param options.vaultConnectorType The vault connector type, defaults to "vault".
	 * @param options.vertexEntityStorageType The entity storage for vertices, defaults to "auditable-item-graph-vertex".
	 * @param options.integrityImmutableStorageType The immutable storage for audit trail, defaults to "auditable-item-graph".
	 * @param options.identityConnectorType The identity connector type, defaults to "identity".
	 */
	constructor(options?: {
		vaultConnectorType?: string;
		vertexEntityStorageType?: string;
		integrityImmutableStorageType?: string;
		identityConnectorType?: string;
		config?: IAuditableItemGraphServiceConfig;
	}) {
		this._vaultConnector = VaultConnectorFactory.get(options?.vaultConnectorType ?? "vault");

		this._vertexStorage = EntityStorageConnectorFactory.get(
			options?.vertexEntityStorageType ?? "auditable-item-graph-vertex"
		);

		this._integrityImmutableStorage = ImmutableStorageConnectorFactory.get(
			options?.integrityImmutableStorageType ?? "auditable-item-graph"
		);

		this._identityConnector = IdentityConnectorFactory.get(
			options?.identityConnectorType ?? "identity"
		);

		this._config = options?.config ?? {};
		this._vaultKeyId = this._config.vaultKeyId ?? "auditable-item-graph";
		this._assertionMethodId = this._config.assertionMethodId ?? "auditable-item-graph";
		this._enableIntegrityCheck = this._config.enableIntegrityCheck ?? false;
	}

	/**
	 * Create a new graph vertex.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param metadata The metadata for the vertex.
	 * @param resources The resources attached to the vertex.
	 * @param edges The edges connected to the vertex.
	 * @param identity The identity to create the auditable item graph operation with.
	 * @param nodeIdentity The node identity to include in the auditable item graph.
	 * @returns The id of the new graph item.
	 */
	public async create(
		aliases?: {
			id: string;
			metadata?: IProperty[];
		}[],
		metadata?: IProperty[],
		resources?: {
			id: string;
			metadata?: IProperty[];
		}[],
		edges?: {
			id: string;
			relationship: string;
			metadata?: IProperty[];
		}[],
		identity?: string,
		nodeIdentity?: string
	): Promise<string> {
		Guards.stringValue(this.CLASS_NAME, nameof(identity), identity);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		try {
			const id = Converter.bytesToHex(RandomHelper.generate(32), false);

			const context: IAuditableItemGraphServiceContext = {
				now: Date.now(),
				userIdentity: identity,
				nodeIdentity,
				changes: []
			};

			const vertexModel: IAuditableItemGraphVertex = {
				id,
				nodeIdentity,
				created: context.now,
				updated: context.now
			};

			this.updateAliasList(context, vertexModel, aliases);
			this.updateMetadataList(context, "vertex", id, vertexModel, metadata);
			this.updateResourceList(context, vertexModel, resources);
			this.updateEdgeList(context, vertexModel, edges);

			await this.addChangeset(context, vertexModel);

			await this._vertexStorage.set(this.vertexModelToEntity(vertexModel));

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
			verifySignatureDepth?: VerifyDepth;
		}
	): Promise<{
		verified?: boolean;
		verification?: {
			[epoch: number]: {
				failure?: string;
				properties?: { [id: string]: unknown };
				changes: IAuditableItemGraphChange[];
			};
		};
		vertex: IAuditableItemGraphVertex;
	}> {
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
			const vertexEntity = await this._vertexStorage.get(vertexId);

			if (Is.empty(vertexEntity)) {
				throw new NotFoundError(this.CLASS_NAME, "vertexNotFound", id);
			}

			const vertexModel = this.vertexEntityToModel(vertexEntity);

			let verified: boolean | undefined;
			let verification:
				| {
						[epoch: number]: {
							failure?: string;
							properties?: { [id: string]: unknown };
							changes: IAuditableItemGraphChange[];
						};
				  }
				| undefined = {};

			if (options?.verifySignatureDepth === "current" || options?.verifySignatureDepth === "all") {
				const verifyResult = await this.verifyChangesets(vertexModel, options.verifySignatureDepth);
				verified = verifyResult.verified;
				verification = verifyResult.verification;
			}

			if (!(options?.includeDeleted ?? false)) {
				if (Is.arrayValue(vertexModel.metadata)) {
					vertexModel.metadata = vertexModel.metadata.filter(a => Is.undefined(a.deleted));
					if (vertexModel.metadata.length === 0) {
						delete vertexModel.metadata;
					}
				}
				if (Is.arrayValue(vertexModel.aliases)) {
					vertexModel.aliases = vertexModel.aliases.filter(a => Is.undefined(a.deleted));
					if (vertexModel.aliases.length === 0) {
						delete vertexModel.aliases;
					}
				}
				if (Is.arrayValue(vertexModel.resources)) {
					vertexModel.resources = vertexModel.resources.filter(r => Is.undefined(r.deleted));
					if (vertexModel.resources.length === 0) {
						delete vertexModel.resources;
					} else {
						for (const resource of vertexModel.resources) {
							if (Is.arrayValue(resource.metadata)) {
								resource.metadata = resource.metadata.filter(m => Is.undefined(m.deleted));
								if (resource.metadata.length === 0) {
									delete resource.metadata;
								}
							}
						}
					}
				}
				if (Is.arrayValue(vertexModel.edges)) {
					vertexModel.edges = vertexModel.edges.filter(r => Is.undefined(r.deleted));
					if (vertexModel.edges.length === 0) {
						delete vertexModel.edges;
					} else {
						for (const edge of vertexModel.edges) {
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
				delete vertexModel.changesets;
			}

			return {
				verified,
				verification,
				vertex: vertexModel
			};
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "getFailed", undefined, error);
		}
	}

	/**
	 * Update a graph vertex.
	 * @param id The id of the vertex to update.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param metadata The metadata for the vertex.
	 * @param resources The resources attached to the vertex.
	 * @param edges The edges connected to the vertex.
	 * @param identity The identity to create the auditable item graph operation with.
	 * @param nodeIdentity The node identity to include in the auditable item graph.
	 * @returns Nothing.
	 */
	public async update(
		id: string,
		aliases?: {
			id: string;
			metadata?: IProperty[];
		}[],
		metadata?: IProperty[],
		resources?: {
			id: string;
			metadata?: IProperty[];
		}[],
		edges?: {
			id: string;
			relationship: string;
			metadata?: IProperty[];
		}[],
		identity?: string,
		nodeIdentity?: string
	): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(identity), identity);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemGraphService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemGraphService.NAMESPACE,
				id
			});
		}

		try {
			const vertexId = urnParsed.namespaceSpecific(0);
			const vertexEntity = await this._vertexStorage.get(vertexId);

			if (Is.empty(vertexEntity)) {
				throw new NotFoundError(this.CLASS_NAME, "vertexNotFound", id);
			}

			const vertexModel = this.vertexEntityToModel(vertexEntity);

			const context: IAuditableItemGraphServiceContext = {
				now: Date.now(),
				userIdentity: identity,
				nodeIdentity,
				changes: []
			};

			this.updateAliasList(context, vertexModel, aliases);
			this.updateMetadataList(context, "vertex", vertexId, vertexModel, metadata);
			this.updateResourceList(context, vertexModel, resources);
			this.updateEdgeList(context, vertexModel, edges);

			const changes = await this.addChangeset(context, vertexModel);

			if (changes) {
				vertexModel.updated = context.now;
				await this._vertexStorage.set(this.vertexModelToEntity(vertexModel));
			}
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "updateFailed", undefined, error);
		}
	}

	/**
	 * Remove the immutable storage for an item.
	 * @param id The id of the vertex to get.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 * @throws NotFoundError if the vertex is not found.
	 */
	public async removeImmutable(id: string, nodeIdentity?: string): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		const urnParsed = Urn.fromValidString(id);

		if (urnParsed.namespaceIdentifier() !== AuditableItemGraphService.NAMESPACE) {
			throw new GeneralError(this.CLASS_NAME, "namespaceMismatch", {
				namespace: AuditableItemGraphService.NAMESPACE,
				id
			});
		}

		try {
			const vertexId = urnParsed.namespaceSpecific(0);
			const vertexEntity = await this._vertexStorage.get(vertexId);

			if (Is.empty(vertexEntity)) {
				throw new NotFoundError(this.CLASS_NAME, "vertexNotFound", id);
			}

			let hasChanged = false;

			if (Is.arrayValue(vertexEntity.changesets)) {
				for (const changeset of vertexEntity.changesets) {
					if (Is.stringValue(changeset.immutableStorageId)) {
						await this._integrityImmutableStorage.remove(
							nodeIdentity,
							changeset.immutableStorageId
						);
						delete changeset.immutableStorageId;
						hasChanged = true;
					}
				}
			}

			if (hasChanged) {
				await this._vertexStorage.set(vertexEntity);
			}
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "removeImmutableFailed", undefined, error);
		}
	}

	/**
	 * Query the graph for vertices.
	 * @param options The query options.
	 * @param options.id The optional id to look for.
	 * @param options.idMode Look in id, alias or both, defaults to both.
	 * @param orderBy The order for the results, defaults to created.
	 * @param orderByDirection The direction for the order, defaults to desc.
	 * @param properties The properties to return, if not provided defaults to id, created, aliases and metadata.
	 * @param cursor The cursor to request the next page of entities.
	 * @param pageSize The maximum number of entities in a page.
	 * @returns The entities, which can be partial if a limited keys list was provided.
	 */
	public async query(
		options?: {
			id?: string;
			idMode?: "id" | "alias" | "both";
		},
		orderBy?: "created" | "updated",
		orderByDirection?: SortDirection,
		properties?: (keyof IAuditableItemGraphVertex)[],
		cursor?: string,
		pageSize?: number
	): Promise<{
		/**
		 * The entities, which can be partial if a limited keys list was provided.
		 */
		entities: Partial<IAuditableItemGraphVertex>[];
		/**
		 * An optional cursor, when defined can be used to call find to get more entities.
		 */
		cursor?: string;
		/**
		 * Number of entities to return.
		 */
		pageSize?: number;
		/**
		 * Total entities length.
		 */
		totalEntities: number;
	}> {
		try {
			const propertiesToReturn = properties ?? ["id", "created", "aliases", "metadata"];
			const conditions = [];
			const orderProperty = orderBy ?? "created";
			const orderDirection = orderByDirection ?? SortDirection.Descending;

			const idOrAlias = options?.id;
			if (Is.stringValue(idOrAlias)) {
				const idMode = options?.idMode ?? "both";
				if (idMode === "id" || idMode === "both") {
					conditions.push({
						property: "id",
						comparison: ComparisonOperator.Includes,
						value: idOrAlias
					});
				}
				if (idMode === "alias" || idMode === "both") {
					conditions.push({
						property: "aliasIndex",
						comparison: ComparisonOperator.Includes,
						value: idOrAlias.toLowerCase()
					});
				}
			}
			const results = await this._vertexStorage.query(
				conditions.length > 0
					? {
							conditions,
							logicalOperator: LogicalOperator.Or
						}
					: undefined,
				[
					{
						property: orderProperty,
						sortDirection: orderDirection
					}
				],
				propertiesToReturn as (keyof AuditableItemGraphVertex)[],
				cursor,
				pageSize
			);

			return results;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "queryingFailed", undefined, error);
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
			updated: vertex.updated,
			nodeIdentity: vertex.nodeIdentity
		};

		if (Is.arrayValue(vertex.aliases)) {
			const aliasIndex = [];
			entity.aliases ??= [];
			for (const alias of vertex.aliases) {
				entity.aliases.push({
					id: alias.id,
					created: alias.created,
					deleted: alias.deleted,
					metadata: this.metadataModelToEntity(alias.metadata)
				});
				aliasIndex.push(alias.id);
			}
			entity.aliasIndex = aliasIndex.join("||").toLowerCase();
		}

		if (Is.arrayValue(vertex.metadata)) {
			entity.metadata = this.metadataModelToEntity(vertex.metadata);
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
					userIdentity: changeset.userIdentity,
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
	private metadataModelToEntity(
		metadata?: IAuditableItemGraphProperty[] | undefined
	): AuditableItemGraphProperty[] | undefined {
		let entity: AuditableItemGraphProperty[] | undefined;

		if (Is.arrayValue(metadata)) {
			entity ??= [];
			for (const metadataElement of metadata) {
				entity.push({
					id: metadataElement.id,
					type: metadataElement.type,
					value: metadataElement.value,
					created: metadataElement.created,
					deleted: metadataElement.deleted
				});
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
			updated: vertex.updated,
			nodeIdentity: vertex.nodeIdentity,
			metadata: this.metadataEntityToModel(vertex.metadata)
		};

		if (Is.arrayValue(vertex.aliases)) {
			model.aliases ??= [];
			for (const alias of vertex.aliases) {
				model.aliases.push({
					id: alias.id,
					created: alias.created,
					deleted: alias.deleted,
					metadata: this.metadataEntityToModel(alias.metadata)
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
					userIdentity: changeset.userIdentity,
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
		metadata: AuditableItemGraphProperty[] | undefined
	): IAuditableItemGraphProperty[] | undefined {
		let models: IAuditableItemGraphProperty[] | undefined;

		if (Is.arrayValue(metadata)) {
			models ??= [];
			for (const meta of metadata) {
				models.push({
					id: meta.id,
					type: meta.type,
					value: meta.value,
					created: meta.created,
					deleted: meta.deleted
				});
			}
		}

		return models;
	}

	/**
	 * Add a change to the current context.
	 * @param context The context for the operation.
	 * @param itemType The type of the item.
	 * @param operation The operation.
	 * @param properties The properties of the item.
	 * @param parentId The parent id of the item.
	 * @internal
	 */
	private addContextChange(
		context: IAuditableItemGraphServiceContext,
		itemType: string,
		operation: "add" | "delete",
		properties: {
			[id: string]: unknown;
		},
		parentId?: string
	): void {
		const change: IAuditableItemGraphChange = {
			itemType,
			parentId,
			operation,
			properties
		};
		context.changes.push({
			changeHash: this.calculateChangeHash(change),
			change
		});
	}

	/**
	 * Calculate the hash for a change.
	 * @param change The change to calculate the hash for.
	 * @returns The hash.
	 * @internal
	 */
	private calculateChangeHash(change: IAuditableItemGraphChange): string {
		const canonical = JsonHelper.canonicalize(change);
		return Converter.bytesToBase64(Blake2b.sum256(Converter.utf8ToBytes(canonical)));
	}

	/**
	 * Update the aliases of a vertex model.
	 * @param context The context for the operation.
	 * @param vertexModel The vertex model.
	 * @param aliases The aliases to update.
	 * @internal
	 */
	private updateAliasList(
		context: IAuditableItemGraphServiceContext,
		vertexModel: IAuditableItemGraphVertex,
		aliases?: {
			id: string;
			metadata?: IProperty[];
		}[]
	): void {
		const activeAliases = vertexModel.aliases?.filter(a => Is.empty(a.deleted)) ?? [];

		// The active aliases that are not in the update list should be marked as deleted.
		if (Is.arrayValue(activeAliases)) {
			for (const alias of activeAliases.filter(a => !aliases?.find(b => b.id === a.id))) {
				this.addContextChange(
					context,
					"alias",
					"delete",
					ObjectHelper.pick(alias, AuditableItemGraphService._ALIAS_KEYS)
				);
				alias.deleted = context.now;
			}
		}

		if (Is.arrayValue(aliases)) {
			for (const alias of aliases) {
				this.updateAlias(context, vertexModel, alias);
			}
		}
	}

	/**
	 * Update an alias in the vertex model.
	 * @param context The context for the operation.
	 * @param vertexModel The vertex model.
	 * @param alias The alias.
	 * @internal
	 */
	private updateAlias(
		context: IAuditableItemGraphServiceContext,
		vertexModel: IAuditableItemGraphVertex,
		alias: {
			id: string;
			metadata?: IProperty[];
		}
	): void {
		Guards.object(this.CLASS_NAME, nameof(alias), alias);
		Guards.stringValue(this.CLASS_NAME, nameof(alias.id), alias.id);

		// Try to find an existing alias with the same id.
		const existing = vertexModel.aliases?.find(a => a.id === alias.id);

		if (Is.empty(existing) || existing?.deleted) {
			// Did not find a matching item, or found one which is deleted.
			vertexModel.aliases ??= [];

			const model: IAuditableItemGraphAlias = {
				id: alias.id,
				created: context.now,
				metadata: ObjectHelper.clone(existing?.metadata)
			};

			vertexModel.aliases.push(model);

			if (!Is.empty(existing)) {
				// If there was an existing alias property, mark it as deleted.
				existing.deleted = context.now;

				this.addContextChange(
					context,
					"alias",
					"delete",
					ObjectHelper.pick(existing, AuditableItemGraphService._ALIAS_KEYS)
				);
			}

			this.addContextChange(
				context,
				"alias",
				"add",
				ObjectHelper.pick(model, AuditableItemGraphService._ALIAS_KEYS)
			);

			this.updateMetadataList(context, "alias", alias.id, model, alias.metadata);
		} else {
			this.updateMetadataList(context, "alias", existing.id, existing, alias.metadata);
		}
	}

	/**
	 * Update the metadata list of a metadata element.
	 * @param context The context for the operation.
	 * @param elementName The name of the element.
	 * @param elementId The id of the element the metadata belongs to.
	 * @param element The aliases to update.
	 * @param updateMetadata The metadata to update.
	 * @internal
	 */
	private updateMetadataList<T extends IAuditableItemGraphMetadataElement>(
		context: IAuditableItemGraphServiceContext,
		elementName: string,
		elementId: string,
		element: T,
		updateMetadata?: IProperty[]
	): void {
		const activeMetadataProperties = element.metadata?.filter(a => Is.empty(a.deleted)) ?? [];

		// The active metadata properties that are not in the update list should be marked as deleted.
		if (Is.arrayValue(activeMetadataProperties)) {
			for (const alias of activeMetadataProperties.filter(
				a => !updateMetadata?.find(b => b.key === a.id)
			)) {
				this.addContextChange(
					context,
					`${elementName}-metadata`,
					"delete",
					ObjectHelper.pick(alias, AuditableItemGraphService._METADATA_PROPERTY_KEYS),
					elementId
				);
				alias.deleted = context.now;
			}
		}

		if (Is.arrayValue(updateMetadata)) {
			for (const metadata of updateMetadata) {
				this.updateMetadata(context, elementName, elementId, element, metadata);
			}
		}
	}

	/**
	 * Update a metadata item.
	 * @param context The context for the operation.
	 * @param elementName The name of the element.
	 * @param elementId The id of the element the metadata belongs to.
	 * @param element The metadata element.
	 * @param metadata The metadata to add.
	 * @param signatureKeys The keys to use for signature generation.
	 * @internal
	 */
	private updateMetadata<T extends IAuditableItemGraphMetadataElement>(
		context: IAuditableItemGraphServiceContext,
		elementName: string,
		elementId: string,
		element: T,
		metadata: IProperty
	): void {
		// Try to find an existing metadata property with the same key.
		const existing = element.metadata?.find(m => m.id === metadata.key);

		if (
			Is.empty(existing) ||
			existing?.deleted ||
			existing?.value !== metadata.value ||
			existing?.type !== metadata.type
		) {
			element.metadata ??= [];

			// Did not find a matching item, or found one which is deleted, or the value has changed.
			const model: IAuditableItemGraphProperty = {
				id: metadata.key,
				created: context.now,
				type: metadata.type,
				value: metadata.value
			};
			element.metadata.push(model);

			if (!Is.empty(existing)) {
				// If there was an existing metadata property, mark it as deleted.
				existing.deleted = context.now;

				this.addContextChange(
					context,
					`${elementName}-metadata`,
					"delete",
					ObjectHelper.pick(existing, AuditableItemGraphService._METADATA_PROPERTY_KEYS),
					elementId
				);
			}

			this.addContextChange(
				context,
				`${elementName}-metadata`,
				"add",
				ObjectHelper.pick(model, AuditableItemGraphService._METADATA_PROPERTY_KEYS),
				elementId
			);
		}
	}

	/**
	 * Update the resources of a vertex model.
	 * @param context The context for the operation.
	 * @param vertexModel The vertex model.
	 * @param resources The resources to update.
	 * @internal
	 */
	private updateResourceList(
		context: IAuditableItemGraphServiceContext,
		vertexModel: IAuditableItemGraphVertex,
		resources?: {
			id: string;
			metadata?: IProperty[];
		}[]
	): void {
		const activeResources = vertexModel.resources?.filter(r => Is.empty(r.deleted)) ?? [];

		// The active resources that are not in the update list should be marked as deleted.
		if (Is.arrayValue(activeResources)) {
			for (const resource of activeResources.filter(r => !resources?.find(b => b.id === r.id))) {
				this.addContextChange(
					context,
					"resource",
					"delete",
					ObjectHelper.pick(resource, AuditableItemGraphService._RESOURCE_KEYS)
				);
				resource.deleted = context.now;
			}
		}

		if (Is.arrayValue(resources)) {
			for (const resource of resources) {
				this.updateResource(context, vertexModel, resource);
			}
		}
	}

	/**
	 * Add a resource to the vertex model.
	 * @param context The context for the operation.
	 * @param vertexModel The vertex model.
	 * @param resource The resource.
	 * @internal
	 */
	private updateResource(
		context: IAuditableItemGraphServiceContext,
		vertexModel: IAuditableItemGraphVertex,
		resource: {
			id: string;
			metadata?: IProperty[];
		}
	): void {
		Guards.object(this.CLASS_NAME, nameof(resource), resource);
		Guards.stringValue(this.CLASS_NAME, nameof(resource.id), resource.id);

		// Try to find an existing resource with the same id.
		const existing = vertexModel.resources?.find(r => r.id === resource.id);

		if (Is.empty(existing) || existing?.deleted) {
			// Did not find a matching item, or found one which is deleted.
			vertexModel.resources ??= [];

			const model: IAuditableItemGraphResource = {
				id: resource.id,
				created: context.now,
				metadata: ObjectHelper.clone(existing?.metadata)
			};

			vertexModel.resources.push(model);

			if (!Is.empty(existing)) {
				// If there was an existing resource property, mark it as deleted.
				existing.deleted = context.now;

				this.addContextChange(
					context,
					"resource",
					"delete",
					ObjectHelper.pick(existing, AuditableItemGraphService._RESOURCE_KEYS)
				);
			}

			this.addContextChange(
				context,
				"resource",
				"add",
				ObjectHelper.pick(model, AuditableItemGraphService._RESOURCE_KEYS)
			);

			this.updateMetadataList(context, "resource", model.id, model, resource.metadata);
		} else {
			this.updateMetadataList(context, "resource", existing.id, existing, resource.metadata);
		}
	}

	/**
	 * Update the edges of a vertex model.
	 * @param context The context for the operation.
	 * @param vertexModel The vertex model.
	 * @param edges The edges to update.
	 * @internal
	 */
	private updateEdgeList(
		context: IAuditableItemGraphServiceContext,
		vertexModel: IAuditableItemGraphVertex,
		edges?: {
			id: string;
			relationship: string;
			metadata?: IProperty[];
		}[]
	): void {
		const activeEdges = vertexModel.edges?.filter(r => Is.empty(r.deleted)) ?? [];

		// The active edges that are not in the update list should be marked as deleted.
		if (Is.arrayValue(activeEdges)) {
			for (const edge of activeEdges.filter(r => !edges?.find(b => b.id === r.id))) {
				this.addContextChange(
					context,
					"edge",
					"delete",
					ObjectHelper.pick(edge, AuditableItemGraphService._EDGE_KEYS)
				);
				edge.deleted = context.now;
			}
		}

		if (Is.arrayValue(edges)) {
			for (const edge of edges) {
				this.updateEdge(context, vertexModel, edge);
			}
		}
	}

	/**
	 * Add an edge to the vertex model.
	 * @param context The context for the operation.
	 * @param vertexModel The vertex model.
	 * @param edge The edge.
	 * @internal
	 */
	private updateEdge(
		context: IAuditableItemGraphServiceContext,
		vertexModel: IAuditableItemGraphVertex,
		edge: {
			id: string;
			relationship: string;
			metadata?: IProperty[];
		}
	): void {
		Guards.object(this.CLASS_NAME, nameof(edge), edge);
		Guards.stringValue(this.CLASS_NAME, nameof(edge.id), edge.id);
		Guards.stringValue(this.CLASS_NAME, nameof(edge.relationship), edge.relationship);

		// Try to find an existing edge with the same id.
		const existing = vertexModel.edges?.find(r => r.id === edge.id);

		if (Is.empty(existing) || existing?.deleted || existing?.relationship !== edge.relationship) {
			// Did not find a matching item, or found one which is deleted.
			vertexModel.edges ??= [];

			const model: IAuditableItemGraphEdge = {
				id: edge.id,
				relationship: edge.relationship,
				created: context.now,
				metadata: ObjectHelper.clone(existing?.metadata)
			};

			vertexModel.edges.push(model);

			if (!Is.empty(existing)) {
				// If there was an existing edge property, mark it as deleted.
				existing.deleted = context.now;

				this.addContextChange(
					context,
					"edge",
					"delete",
					ObjectHelper.pick(existing, AuditableItemGraphService._EDGE_KEYS)
				);
			}

			this.addContextChange(
				context,
				"edge",
				"add",
				ObjectHelper.pick(model, AuditableItemGraphService._EDGE_KEYS)
			);

			this.updateMetadataList(context, "edge", model.id, model, edge.metadata);
		} else {
			this.updateMetadataList(context, "edge", existing.id, existing, edge.metadata);
		}
	}

	/**
	 * Add a changeset to the vertex and generate the associated verifications.
	 * @param context The context for the operation.
	 * @param vertex The vertex model.
	 * @returns True if there were changes.
	 * @internal
	 */
	private async addChangeset(
		context: IAuditableItemGraphServiceContext,
		vertex: IAuditableItemGraphVertex
	): Promise<boolean> {
		const changeSets = vertex.changesets ?? [];

		// console.log("Add Changeset", JSON.stringify(context.changes, null, 2));
		context.changes.sort((a, b) => a.changeHash.localeCompare(b.changeHash));

		if (context.changes.length > 0 || changeSets.length === 0) {
			const b2b = new Blake2b(Blake2b.SIZE_256);

			// If there are previous changesets, add the most recent one to the new hash.
			// This provides a link to previous integrity checks.
			if (changeSets.length > 0) {
				b2b.update(Converter.base64ToBytes(changeSets[changeSets.length - 1].hash));
			}

			// Add the epoch and the identity in to the signature
			b2b.update(Converter.utf8ToBytes(context.now.toString()));
			b2b.update(Converter.utf8ToBytes(context.userIdentity));

			// Add the signature objects to the hash.
			for (const change of context.changes) {
				b2b.update(ObjectHelper.toBytes(change));
			}

			const changeSetHash = b2b.digest();

			// Generate the signature for the changeset using the hash.
			const signature = await this._vaultConnector.sign(
				`${context.nodeIdentity}/${this._vaultKeyId}`,
				changeSetHash
			);

			// Create the data for the verifiable credential
			const credentialData: IAuditableItemGraphCredential = {
				signature: Converter.bytesToBase64(signature)
			};

			// If integrity check is enabled add an encrypted version of the changes to the credential data.
			if (this._enableIntegrityCheck) {
				const integrityData: IAuditableItemGraphIntegrity = {
					userIdentity: context.userIdentity,
					changes: context.changes.map(c => c.change)
				};
				const canonical = JsonHelper.canonicalize(integrityData);
				const encrypted = await this._vaultConnector.encrypt(
					`${context.nodeIdentity}/${this._vaultKeyId}`,
					VaultEncryptionType.ChaCha20Poly1305,
					Converter.utf8ToBytes(canonical)
				);

				credentialData.integrity = Converter.bytesToBase64(encrypted);
			}

			// Create the verifiable credential
			const verifiableCredential = await this._identityConnector.createVerifiableCredential(
				context.nodeIdentity,
				`${context.nodeIdentity}#${this._assertionMethodId}`,
				undefined,
				"AuditableItemGraphIntegrity",
				credentialData
			);

			// Store the verifiable credential immutably
			const immutableStorageId = await this._integrityImmutableStorage.store(
				context.nodeIdentity,
				Converter.utf8ToBytes(verifiableCredential.jwt)
			);

			// Link the immutable storage id to the changeset
			changeSets.push({
				created: context.now,
				userIdentity: context.userIdentity,
				hash: Converter.bytesToBase64(changeSetHash),
				immutableStorageId
			});

			vertex.changesets = changeSets;

			return true;
		}

		return false;
	}

	/**
	 * Verify the changesets of a vertex.
	 * @param nodeIdentity The node identity to verify the changesets with.
	 * @param vertex The vertex to verify.
	 * @param verifySignatureDepth How many signatures to verify.
	 * @internal
	 */
	private async verifyChangesets(
		vertex: IAuditableItemGraphVertex,
		verifySignatureDepth: Omit<VerifyDepth, "none">
	): Promise<{
		verified?: boolean;
		verification?: {
			[epoch: number]: {
				failure?: string;
				properties?: { [id: string]: unknown };
				changes: IAuditableItemGraphChange[];
			};
		};
	}> {
		let verified: boolean = true;
		const verification:
			| {
					[epoch: number]: {
						failure?: string;
						properties?: { [id: string]: unknown };
						changes: IAuditableItemGraphChange[];
					};
			  }
			| undefined = {};

		// First convert the vertex data to a changeset map based on the epochs
		const epochSignatureObjects: {
			[epoch: number]: {
				changeHash: string;
				change: IAuditableItemGraphChange;
			}[];
		} = {};

		this.calculateChangesetList(
			vertex.aliases,
			"alias",
			AuditableItemGraphService._ALIAS_KEYS,
			epochSignatureObjects
		);
		this.calculateChangesetMetadataList(
			vertex.id,
			"vertex",
			vertex.metadata,
			epochSignatureObjects
		);
		this.calculateChangesetList(
			vertex.resources,
			"resource",
			AuditableItemGraphService._RESOURCE_KEYS,
			epochSignatureObjects
		);
		this.calculateChangesetList(
			vertex.edges,
			"edge",
			AuditableItemGraphService._EDGE_KEYS,
			epochSignatureObjects
		);

		if (Is.arrayValue(vertex.changesets)) {
			let lastHash: Uint8Array | undefined;
			for (let i = 0; i < vertex.changesets.length; i++) {
				const calculatedChangeset = vertex.changesets[i];
				const calculatedChanges = epochSignatureObjects[calculatedChangeset.created] ?? [];
				calculatedChanges.sort((a, b) => a.changeHash.localeCompare(b.changeHash));
				// console.log("Calculated Changeset", JSON.stringify(calculatedChangesWithHash, null, 2));

				verification[vertex.changesets[i].created] = {
					changes: calculatedChanges.map(c => c.change)
				};

				const b2b = new Blake2b(Blake2b.SIZE_256);
				// Add the last hash if there is one
				if (Is.uint8Array(lastHash)) {
					b2b.update(lastHash);
				}
				// Add the epoch and the identity in to the signature
				b2b.update(Converter.utf8ToBytes(calculatedChangeset.created.toString()));
				b2b.update(Converter.utf8ToBytes(calculatedChangeset.userIdentity));

				// Add the signature objects to the hash.
				for (const change of calculatedChanges) {
					b2b.update(ObjectHelper.toBytes(change));
				}
				const verifyHash = b2b.digest();

				lastHash = verifyHash;

				if (Converter.bytesToBase64(verifyHash) !== calculatedChangeset.hash) {
					verification[vertex.changesets[i].created].failure = "invalidChangesetHash";
					verification[vertex.changesets[i].created].properties = {
						hash: calculatedChangeset.hash,
						epoch: calculatedChangeset.created
					};
					verified = false;
				}

				if (
					verifySignatureDepth === "all" ||
					(verifySignatureDepth === "current" && i === vertex.changesets.length - 1)
				) {
					let integrityChangeset: IAuditableItemGraphChange[] | undefined;
					let integrityNodeIdentity: string | undefined;
					let integrityUserIdentity: string | undefined;

					// Create the signature for the local changeset
					const changesetSignature = await this._vaultConnector.sign(
						`${vertex.nodeIdentity}/${this._vaultKeyId}`,
						verifyHash
					);

					if (Is.stringValue(calculatedChangeset.immutableStorageId)) {
						// Get the vc from the immutable data store
						const verifiableCredentialBytes = await this._integrityImmutableStorage.get(
							calculatedChangeset.immutableStorageId
						);
						const verifiableCredentialJwt = Converter.bytesToUtf8(verifiableCredentialBytes);
						const decodedJwt = await Jwt.decode(verifiableCredentialJwt);

						// Verify the credential
						const verificationResult =
							await this._identityConnector.checkVerifiableCredential<IAuditableItemGraphCredential>(
								verifiableCredentialJwt
							);

						if (verificationResult.revoked) {
							verification[vertex.changesets[i].created].failure = "changesetCredentialRevoked";
						} else {
							// Credential is not revoked so check the signature
							const credentialData = Is.array(
								verificationResult.verifiableCredential?.credentialSubject
							)
								? verificationResult.verifiableCredential?.credentialSubject[0]
								: verificationResult.verifiableCredential?.credentialSubject ?? {
										signature: ""
									};

							integrityNodeIdentity = DocumentHelper.parse(decodedJwt.header?.kid ?? "").id;

							// Does the immutable signature match the local one we calculated
							if (credentialData.signature !== Converter.bytesToBase64(changesetSignature)) {
								verification[vertex.changesets[i].created].failure = "invalidChangesetSignature";
							} else if (Is.stringValue(credentialData.integrity)) {
								const decrypted = await this._vaultConnector.decrypt(
									`${vertex.nodeIdentity}/${this._vaultKeyId}`,
									VaultEncryptionType.ChaCha20Poly1305,
									Converter.base64ToBytes(credentialData.integrity)
								);

								const canonical = Converter.bytesToUtf8(decrypted);
								const calculatedIntegrity: IAuditableItemGraphIntegrity = {
									userIdentity: calculatedChangeset.userIdentity,
									changes: calculatedChanges.map(c => c.change)
								};
								if (canonical !== JsonHelper.canonicalize(calculatedIntegrity)) {
									verification[vertex.changesets[i].created].failure = "invalidChangesetCanonical";
								}
								const changesAndIdentity: IAuditableItemGraphIntegrity = JSON.parse(canonical);
								integrityChangeset = changesAndIdentity.changes;
								integrityUserIdentity = changesAndIdentity.userIdentity;
							}
						}
					}

					// If there was a failure add some additional information
					if (Is.stringValue(verification[vertex.changesets[i].created].failure)) {
						verification[vertex.changesets[i].created].properties = {
							hash: calculatedChangeset.hash,
							epoch: calculatedChangeset.created,
							calculatedChangeset,
							integrityChangeset,
							integrityNodeIdentity,
							integrityUserIdentity
						};
						verified = false;
					}
				}
			}
		}

		return {
			verified,
			verification
		};
	}

	/**
	 * Build the changesets of a metadata list.
	 * @param parentId The id of the parent element.
	 * @param elementName The name of the element.
	 * @param metadataList The metadata list to verify.
	 * @param epochSignatureObjects The epoch signature objects to add to.
	 * @internal
	 */
	private calculateChangesetMetadataList(
		parentId: string,
		elementName: string,
		metadataList: IAuditableItemGraphProperty[] | undefined,
		epochSignatureObjects: {
			[epoch: number]: {
				changeHash: string;
				change: IAuditableItemGraphChange;
			}[];
		}
	): void {
		if (Is.arrayValue(metadataList)) {
			for (const metadata of metadataList) {
				if (!Is.empty(metadata.deleted)) {
					epochSignatureObjects[metadata.deleted] ??= [];

					const change: IAuditableItemGraphChange = {
						itemType: `${elementName}-metadata`,
						parentId,
						operation: "delete",
						properties: ObjectHelper.pick(
							metadata,
							AuditableItemGraphService._METADATA_PROPERTY_KEYS
						)
					};
					const changeHash = this.calculateChangeHash(change);
					if (!epochSignatureObjects[metadata.deleted].some(a => a.changeHash === changeHash)) {
						epochSignatureObjects[metadata.deleted].push({
							changeHash,
							change
						});
					}
				}

				epochSignatureObjects[metadata.created] ??= [];

				const change: IAuditableItemGraphChange = {
					itemType: `${elementName}-metadata`,
					parentId,
					operation: "add",
					properties: ObjectHelper.pick(metadata, AuditableItemGraphService._METADATA_PROPERTY_KEYS)
				};
				const changeHash = this.calculateChangeHash(change);
				if (!epochSignatureObjects[metadata.created].some(a => a.changeHash === changeHash)) {
					epochSignatureObjects[metadata.created].push({
						changeHash,
						change
					});
				}
			}
		}
	}

	/**
	 * Build the changesets of a list.
	 * @param items The aliases to verify.
	 * @param itemType The type of the item.
	 * @param keys The keys to use for signature generation.
	 * @param epochSignatureObjects The epoch signature objects to add to.
	 * @internal
	 */
	private calculateChangesetList<
		T extends IAuditableItemGraphAuditedElement & IAuditableItemGraphMetadataElement
	>(
		items: T[] | undefined,
		itemType: string,
		keys: (keyof T)[],
		epochSignatureObjects: {
			[epoch: number]: {
				changeHash: string;
				change: IAuditableItemGraphChange;
			}[];
		}
	): void {
		if (Is.arrayValue(items)) {
			for (const item of items) {
				if (!Is.empty(item.deleted)) {
					epochSignatureObjects[item.deleted] ??= [];
					const change: IAuditableItemGraphChange = {
						itemType,
						operation: "delete",
						properties: ObjectHelper.pick(item, keys)
					};
					const changeHash = this.calculateChangeHash(change);
					if (!epochSignatureObjects[item.deleted].some(a => a.changeHash === changeHash)) {
						epochSignatureObjects[item.deleted].push({
							changeHash,
							change
						});
					}
				}

				epochSignatureObjects[item.created] ??= [];

				const change: IAuditableItemGraphChange = {
					itemType,
					operation: "add",
					properties: ObjectHelper.pick(item, keys)
				};
				const changeHash = this.calculateChangeHash(change);
				if (!epochSignatureObjects[item.created].some(a => a.changeHash === changeHash)) {
					epochSignatureObjects[item.created].push({
						changeHash,
						change
					});
				}

				this.calculateChangesetMetadataList(
					item.id,
					itemType,
					item.metadata,
					epochSignatureObjects
				);
			}
		}
	}
}
