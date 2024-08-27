// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuditableItemGraphAlias,
	IAuditableItemGraphChange,
	IAuditableItemGraphComponent,
	IAuditableItemGraphEdge,
	IAuditableItemGraphImmutable,
	IAuditableItemGraphMetadataElement,
	IAuditableItemGraphProperty,
	IAuditableItemGraphResource,
	IAuditableItemGraphVertex
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
import {
	VaultConnectorFactory,
	VaultEncryptionType,
	type IVaultConnector
} from "@gtsc/vault-models";
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
	 * The immutable storage for the audit trail.
	 * @internal
	 */
	private readonly _auditTrailImmutableStorage: IImmutableStorageConnector;

	/**
	 * The vault key for signing or encrypting the data.
	 * @internal
	 */
	private readonly _vaultKeyId: string;

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
		this._vaultKeyId = this._config.vaultKeyId ?? "auditable-item-graph";
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
				identity,
				nodeIdentity,
				changes: []
			};

			const vertexModel: IAuditableItemGraphVertex = {
				id,
				nodeIdentity,
				created: context.now
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
			verifySignatureDepth?: "none" | "current" | "all";
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
				identity,
				nodeIdentity,
				changes: []
			};

			this.updateAliasList(context, vertexModel, aliases);
			this.updateMetadataList(context, "vertex", vertexId, vertexModel, metadata);
			this.updateResourceList(context, vertexModel, resources);
			this.updateEdgeList(context, vertexModel, edges);

			await this.addChangeset(context, vertexModel);

			await this._vertexStorage.set(this.vertexModelToEntity(vertexModel));
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "updateFailed", undefined, error);
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
			nodeIdentity: vertex.nodeIdentity
		};

		if (Is.arrayValue(vertex.aliases)) {
			entity.aliases ??= [];
			for (const alias of vertex.aliases) {
				entity.aliases.push({
					id: alias.id,
					created: alias.created,
					deleted: alias.deleted,
					metadata: this.metadataModelToEntity(alias.metadata)
				});
			}
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
				context.changes.push({
					itemType: "alias",
					operation: "delete",
					changed: ObjectHelper.pick(alias, AuditableItemGraphService._ALIAS_KEYS)
				});
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
				metadata: existing?.metadata
			};

			vertexModel.aliases.push(model);

			context.changes.push({
				itemType: "alias",
				operation: "add",
				changed: ObjectHelper.pick(model, AuditableItemGraphService._ALIAS_KEYS)
			});

			this.updateMetadataList(context, "alias", alias.id, model, alias.metadata);
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
				context.changes.push({
					itemType: `${elementName}-metadata`,
					parentId: elementId,
					operation: "delete",
					changed: ObjectHelper.pick(alias, AuditableItemGraphService._METADATA_PROPERTY_KEYS)
				});
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
		element.metadata ??= [];

		// Try to find an existing metadata property with the same key.
		const existing = element.metadata?.find(m => m.id === metadata.key);

		if (
			Is.empty(existing) ||
			existing?.deleted ||
			existing?.value !== metadata.value ||
			existing?.type !== metadata.type
		) {
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

				context.changes.push({
					itemType: `${elementName}-metadata`,
					parentId: elementId,
					operation: "delete",
					changed: ObjectHelper.pick(existing, AuditableItemGraphService._METADATA_PROPERTY_KEYS)
				});
			}

			context.changes.push({
				itemType: `${elementName}-metadata`,
				parentId: elementId,
				operation: "add",
				changed: ObjectHelper.pick(model, AuditableItemGraphService._METADATA_PROPERTY_KEYS)
			});
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
				context.changes.push({
					itemType: "resource",
					operation: "delete",
					changed: ObjectHelper.pick(resource, AuditableItemGraphService._RESOURCE_KEYS)
				});
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
				metadata: existing?.metadata
			};

			vertexModel.resources.push(model);

			context.changes.push({
				itemType: "resource",
				operation: "add",
				changed: ObjectHelper.pick(model, AuditableItemGraphService._RESOURCE_KEYS)
			});

			this.updateMetadataList(context, "resource", resource.id, model, resource.metadata);
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
				context.changes.push({
					itemType: "edge",
					operation: "delete",
					changed: ObjectHelper.pick(edge, AuditableItemGraphService._EDGE_KEYS)
				});
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
				metadata: existing?.metadata
			};

			vertexModel.edges.push(model);

			if (!Is.empty(existing)) {
				// If there was an existing edge, mark it as deleted.
				existing.deleted = context.now;

				context.changes.push({
					itemType: "edge",
					operation: "delete",
					changed: ObjectHelper.pick(existing, AuditableItemGraphService._EDGE_KEYS)
				});
			}
			context.changes.push({
				itemType: "edge",
				operation: "add",
				changed: ObjectHelper.pick(model, AuditableItemGraphService._EDGE_KEYS)
			});

			this.updateMetadataList(context, "edge", edge.id, model, edge.metadata);
		}
	}

	/**
	 * Add a changeset to the vertex and generate the associated verifications.
	 * @param context The context for the operation.
	 * @param vertex The vertex model.
	 * @internal
	 */
	private async addChangeset(
		context: IAuditableItemGraphServiceContext,
		vertex: IAuditableItemGraphVertex
	): Promise<void> {
		const changeSets = vertex.changesets ?? [];

		if (context.changes.length > 0 || changeSets.length === 0) {
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
			for (const change of context.changes) {
				b2b.update(ObjectHelper.toBytes(change));
			}

			const changeSetHash = b2b.digest();

			// Generate the signature for the changeset using the hash.
			const signature = await this._vaultConnector.sign(
				`${context.nodeIdentity}/${this._vaultKeyId}`,
				changeSetHash
			);

			const immutable: IAuditableItemGraphImmutable = {
				signature: Converter.bytesToBase64(signature)
			};

			if (this._enableIntegrityCheck) {
				immutable.canonical = JsonHelper.canonicalize(context.changes);
			}

			const encrypted = await this._vaultConnector.encrypt(
				`${context.nodeIdentity}/${this._vaultKeyId}`,
				VaultEncryptionType.ChaCha20Poly1305,
				ObjectHelper.toBytes(immutable)
			);

			// Store the signature and integrity changes immutably
			const immutableStorageId = await this._auditTrailImmutableStorage.store(
				context.nodeIdentity,
				encrypted
			);

			changeSets.push({
				created: context.now,
				identity: context.identity,
				hash: Converter.bytesToBase64(changeSetHash),
				immutableStorageId
			});

			vertex.changesets = changeSets;
		}
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
		verifySignatureDepth: "current" | "all"
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

		// First convert the vertex data to a map based on the epochs
		const epochSignatureObjects: { [epoch: number]: IAuditableItemGraphChange[] } = {};

		this.buildChangesetAliasList(vertex.aliases, epochSignatureObjects);
		this.buildChangesetMetadataList(vertex.id, "vertex", vertex.metadata, epochSignatureObjects);
		this.buildChangesetResourceList(vertex.resources, epochSignatureObjects);
		this.buildChangesetEdgeList(vertex.edges, epochSignatureObjects);

		if (Is.arrayValue(vertex.changesets)) {
			let lastHash: Uint8Array | undefined;
			for (let i = 0; i < vertex.changesets.length; i++) {
				const changeset = vertex.changesets[i];
				const changes = epochSignatureObjects[changeset.created] ?? [];

				verification[vertex.changesets[i].created] = {
					changes
				};

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

				lastHash = verifyHash;

				if (Converter.bytesToBase64(verifyHash) !== changeset.hash) {
					verification[vertex.changesets[i].created].failure = "invalidChangesetHash";
					verification[vertex.changesets[i].created].properties = {
						hash: changeset.hash,
						epoch: changeset.created
					};
					verified = false;
				}

				if (
					verifySignatureDepth === "all" ||
					(verifySignatureDepth === "current" && i === vertex.changesets.length - 1)
				) {
					const signature = await this._vaultConnector.sign(
						`${vertex.nodeIdentity}/${this._vaultKeyId}`,
						verifyHash
					);

					let decrypted = await this._auditTrailImmutableStorage.get(changeset.immutableStorageId);

					if (this._enableIntegrityCheck) {
						decrypted = await this._vaultConnector.decrypt(
							`${vertex.nodeIdentity}/${this._vaultKeyId}`,
							VaultEncryptionType.ChaCha20Poly1305,
							decrypted
						);
					}

					const immutableObject = ObjectHelper.fromBytes<IAuditableItemGraphImmutable>(decrypted);

					if (immutableObject.signature !== Converter.bytesToBase64(signature)) {
						verification[vertex.changesets[i].created].failure = "invalidChangesetSignature";
						verification[vertex.changesets[i].created].properties = {
							hash: changeset.hash,
							epoch: changeset.created
						};
						verified = false;
					}

					if (
						this._enableIntegrityCheck &&
						immutableObject.canonical !== JsonHelper.canonicalize(changes)
					) {
						verification[vertex.changesets[i].created].failure = "invalidChangesetCanonical";
						verification[vertex.changesets[i].created].properties = {
							hash: changeset.hash,
							epoch: changeset.created
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
	 */
	private buildChangesetMetadataList(
		parentId: string,
		elementName: string,
		metadataList: IAuditableItemGraphProperty[] | undefined,
		epochSignatureObjects: { [epoch: number]: IAuditableItemGraphChange[] }
	): void {
		if (Is.arrayValue(metadataList)) {
			for (const metadata of metadataList) {
				if (!Is.empty(metadata.deleted)) {
					epochSignatureObjects[metadata.deleted] ??= [];
					epochSignatureObjects[metadata.deleted].push({
						itemType: `${elementName}-metadata`,
						parentId,
						operation: "delete",
						changed: ObjectHelper.pick(metadata, AuditableItemGraphService._METADATA_PROPERTY_KEYS)
					});
				}

				epochSignatureObjects[metadata.created] ??= [];
				epochSignatureObjects[metadata.created].push({
					itemType: `${elementName}-metadata`,
					parentId,
					operation: "add",
					changed: ObjectHelper.pick(metadata, AuditableItemGraphService._METADATA_PROPERTY_KEYS)
				});
			}
		}
	}

	/**
	 * Build the changesets of an alias list.
	 * @param aliases The aliases to verify.
	 * @param epochSignatureObjects The epoch signature objects to add to.
	 */
	private buildChangesetAliasList(
		aliases: IAuditableItemGraphAlias[] | undefined,
		epochSignatureObjects: { [epoch: number]: IAuditableItemGraphChange[] }
	): void {
		if (Is.arrayValue(aliases)) {
			for (const alias of aliases) {
				if (!Is.empty(alias.deleted)) {
					epochSignatureObjects[alias.deleted] ??= [];
					epochSignatureObjects[alias.deleted].push({
						itemType: "alias",
						operation: "delete",
						changed: ObjectHelper.pick(alias, AuditableItemGraphService._ALIAS_KEYS)
					});
				}

				epochSignatureObjects[alias.created] ??= [];
				epochSignatureObjects[alias.created].push({
					itemType: "alias",
					operation: "add",
					changed: ObjectHelper.pick(alias, AuditableItemGraphService._ALIAS_KEYS)
				});

				this.buildChangesetMetadataList(alias.id, "alias", alias.metadata, epochSignatureObjects);
			}
		}
	}

	/**
	 * Build the changesets of a resource list.
	 * @param resources The resources to verify.
	 * @param epochSignatureObjects The epoch signature objects to add to.
	 */
	private buildChangesetResourceList(
		resources: IAuditableItemGraphResource[] | undefined,
		epochSignatureObjects: { [epoch: number]: IAuditableItemGraphChange[] }
	): void {
		if (Is.arrayValue(resources)) {
			for (const resource of resources) {
				if (!Is.empty(resource.deleted)) {
					epochSignatureObjects[resource.deleted] ??= [];
					epochSignatureObjects[resource.deleted].push({
						itemType: "resource",
						operation: "delete",
						changed: ObjectHelper.pick(resource, AuditableItemGraphService._RESOURCE_KEYS)
					});
				}

				epochSignatureObjects[resource.created] ??= [];
				epochSignatureObjects[resource.created].push({
					itemType: "resource",
					operation: "add",
					changed: ObjectHelper.pick(resource, AuditableItemGraphService._RESOURCE_KEYS)
				});

				this.buildChangesetMetadataList(
					resource.id,
					"resource",
					resource.metadata,
					epochSignatureObjects
				);
			}
		}
	}

	/**
	 * Build the changesets of an edge list.
	 * @param edges The edges to verify.
	 * @param epochSignatureObjects The epoch signature objects to add to.
	 */
	private buildChangesetEdgeList(
		edges: IAuditableItemGraphEdge[] | undefined,
		epochSignatureObjects: { [epoch: number]: IAuditableItemGraphChange[] }
	): void {
		if (Is.arrayValue(edges)) {
			for (const edge of edges) {
				if (!Is.empty(edge.deleted)) {
					epochSignatureObjects[edge.deleted] ??= [];
					epochSignatureObjects[edge.deleted].push({
						itemType: "edge",
						operation: "delete",
						changed: ObjectHelper.pick(edge, AuditableItemGraphService._EDGE_KEYS)
					});
				}

				epochSignatureObjects[edge.created] ??= [];
				epochSignatureObjects[edge.created].push({
					itemType: "edge",
					operation: "add",
					changed: ObjectHelper.pick(edge, AuditableItemGraphService._EDGE_KEYS)
				});

				this.buildChangesetMetadataList(edge.id, "edge", edge.metadata, epochSignatureObjects);
			}
		}
	}
}
