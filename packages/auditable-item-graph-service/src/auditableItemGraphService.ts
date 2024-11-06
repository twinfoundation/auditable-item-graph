// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuditableItemGraphTypes,
	VerifyDepth,
	type IAuditableItemGraphAlias,
	type IAuditableItemGraphChangeset,
	type IAuditableItemGraphComponent,
	type IAuditableItemGraphEdge,
	type IAuditableItemGraphResource,
	type IAuditableItemGraphVertex,
	type IAuditableItemGraphVertexList
} from "@twin.org/auditable-item-graph-models";
import {
	ComponentFactory,
	Converter,
	GeneralError,
	Guards,
	Is,
	JsonHelper,
	NotFoundError,
	ObjectHelper,
	RandomHelper,
	StringHelper,
	Urn,
	Validation,
	type IValidationFailure
} from "@twin.org/core";
import { JsonLdHelper, JsonLdProcessor, type IJsonLdNodeObject } from "@twin.org/data-json-ld";
import { SchemaOrgDataTypes, SchemaOrgTypes } from "@twin.org/data-schema-org";
import { ComparisonOperator, LogicalOperator, SortDirection } from "@twin.org/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import {
	ImmutableProofFailure,
	ImmutableProofTypes,
	type IImmutableProofComponent
} from "@twin.org/immutable-proof-models";
import { nameof } from "@twin.org/nameof";
import type { AuditableItemGraphAlias } from "./entities/auditableItemGraphAlias";
import type { AuditableItemGraphChangeset } from "./entities/auditableItemGraphChangeset";
import type { AuditableItemGraphEdge } from "./entities/auditableItemGraphEdge";
import type { AuditableItemGraphResource } from "./entities/auditableItemGraphResource";
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
	 * The namespace for the service changeset.
	 */
	public static readonly NAMESPACE_CHANGESET: string = "changeset";

	/**
	 * The keys to pick when creating the proof for the stream.
	 */
	private static readonly _PROOF_KEYS_CHANGESET: (keyof AuditableItemGraphChangeset)[] = [
		"id",
		"vertexId",
		"userIdentity",
		"dateCreated",
		"patches"
	];

	/**
	 * Runtime name for the class.
	 */
	public readonly CLASS_NAME: string = nameof<AuditableItemGraphService>();

	/**
	 * The immutable proof component.
	 * @internal
	 */
	private readonly _immutableProofComponent: IImmutableProofComponent;

	/**
	 * The entity storage for vertices.
	 * @internal
	 */
	private readonly _vertexStorage: IEntityStorageConnector<AuditableItemGraphVertex>;

	/**
	 * The entity storage for changesets.
	 * @internal
	 */
	private readonly _changesetStorage: IEntityStorageConnector<AuditableItemGraphChangeset>;

	/**
	 * Create a new instance of AuditableItemGraphService.
	 * @param options The dependencies for the auditable item graph connector.
	 * @param options.config The configuration for the connector.
	 * @param options.immutableProofComponentType The immutable proof component type, defaults to "immutable-proof".
	 * @param options.vertexEntityStorageType The entity storage for vertices, defaults to "auditable-item-graph-vertex".
	 * @param options.changesetEntityStorageType The entity storage for changesets, defaults to "auditable-item-graph-changeset".
	 */
	constructor(options?: {
		immutableProofComponentType?: string;
		vertexEntityStorageType?: string;
		changesetEntityStorageType?: string;
		config?: IAuditableItemGraphServiceConfig;
	}) {
		this._immutableProofComponent = ComponentFactory.get(
			options?.immutableProofComponentType ?? "immutable-proof"
		);

		this._vertexStorage = EntityStorageConnectorFactory.get(
			options?.vertexEntityStorageType ?? StringHelper.kebabCase(nameof<AuditableItemGraphVertex>())
		);

		this._changesetStorage = EntityStorageConnectorFactory.get(
			options?.changesetEntityStorageType ??
				StringHelper.kebabCase(nameof<AuditableItemGraphChangeset>())
		);

		SchemaOrgDataTypes.registerRedirects();
	}

	/**
	 * Create a new graph vertex.
	 * @param vertexObject The object for the vertex as JSON-LD.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param resources The resources attached to the vertex.
	 * @param edges The edges connected to the vertex.
	 * @param userIdentity The identity to create the auditable item graph operation with.
	 * @param nodeIdentity The node identity to include in the auditable item graph.
	 * @returns The id of the new graph item.
	 */
	public async create(
		vertexObject?: IJsonLdNodeObject,
		aliases?: {
			id: string;
			aliasFormat?: string;
			aliasObject?: IJsonLdNodeObject;
		}[],
		resources?: {
			id: string;
			resourceObject?: IJsonLdNodeObject;
		}[],
		edges?: {
			id: string;
			edgeRelationship: string;
			edgeObject?: IJsonLdNodeObject;
		}[],
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<string> {
		Guards.stringValue(this.CLASS_NAME, nameof(userIdentity), userIdentity);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		try {
			if (Is.object(vertexObject)) {
				const validationFailures: IValidationFailure[] = [];
				await JsonLdHelper.validate(vertexObject, validationFailures);
				Validation.asValidationError(this.CLASS_NAME, nameof(vertexObject), validationFailures);
			}

			const id = Converter.bytesToHex(RandomHelper.generate(32), false);

			const context: IAuditableItemGraphServiceContext = {
				now: new Date(Date.now()).toISOString(),
				userIdentity,
				nodeIdentity
			};

			const vertex: AuditableItemGraphVertex = {
				id,
				nodeIdentity,
				dateCreated: context.now,
				dateModified: context.now
			};
			const originalEntity = ObjectHelper.clone(vertex);

			vertex.vertexObject = vertexObject;

			await this.updateAliasList(context, vertex, aliases);
			await this.updateResourceList(context, vertex, resources);
			await this.updateEdgeList(context, vertex, edges);

			delete originalEntity.aliasIndex;
			await this.addChangeset(context, originalEntity, vertex, true);

			await this._vertexStorage.set({
				...vertex,
				aliasIndex: vertex.aliases
					?.map(a => a.id)
					.join("||")
					.toLowerCase()
			});

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
	 * @param options.includeDeleted Whether to include deleted/updated aliases, resource, edges, defaults to false.
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
			const vertexEntity = await this._vertexStorage.get(vertexId);

			if (Is.empty(vertexEntity)) {
				throw new NotFoundError(this.CLASS_NAME, "vertexNotFound", id);
			}

			const vertexModel = this.vertexEntityToJsonLd(vertexEntity);

			const includeChangesets = options?.includeChangesets ?? false;
			const verifySignatureDepth = options?.verifySignatureDepth ?? "none";

			let verified: boolean | undefined;
			let changesets: IAuditableItemGraphChangeset[] | undefined;

			if (
				verifySignatureDepth === VerifyDepth.Current ||
				verifySignatureDepth === VerifyDepth.All ||
				includeChangesets
			) {
				const verifyResult = await this.verifyChangesets(vertexModel, verifySignatureDepth);
				verified = verifyResult.verified;
				changesets = verifyResult.changesets;
			}

			if (!(options?.includeDeleted ?? false)) {
				if (Is.arrayValue(vertexModel.aliases)) {
					vertexModel.aliases = vertexModel.aliases.filter(a => Is.undefined(a.dateDeleted));
					if (vertexModel.aliases.length === 0) {
						delete vertexModel.aliases;
					}
				}
				if (Is.arrayValue(vertexModel.resources)) {
					vertexModel.resources = vertexModel.resources.filter(r => Is.undefined(r.dateDeleted));
					if (vertexModel.resources.length === 0) {
						delete vertexModel.resources;
					}
				}
				if (Is.arrayValue(vertexModel.edges)) {
					vertexModel.edges = vertexModel.edges.filter(r => Is.undefined(r.dateDeleted));
					if (vertexModel.edges.length === 0) {
						delete vertexModel.edges;
					}
				}
			}

			if (includeChangesets) {
				vertexModel.changesets = changesets;
			}

			if (verifySignatureDepth !== VerifyDepth.None) {
				vertexModel.verified = verified;
			}

			const compacted = await JsonLdProcessor.compact(vertexModel, vertexModel["@context"]);
			return compacted as IAuditableItemGraphVertex;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "getFailed", undefined, error);
		}
	}

	/**
	 * Update a graph vertex.
	 * @param id The id of the vertex to update.
	 * @param vertexObject The object for the vertex.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param resources The resources attached to the vertex.
	 * @param edges The edges connected to the vertex.
	 * @param userIdentity The identity to create the auditable item graph operation with.
	 * @param nodeIdentity The node identity to include in the auditable item graph.
	 * @returns Nothing.
	 */
	public async update(
		id: string,
		vertexObject?: IJsonLdNodeObject,
		aliases?: {
			id: string;
			aliasFormat?: string;
			aliasObject?: IJsonLdNodeObject;
		}[],
		resources?: {
			id: string;
			resourceObject?: IJsonLdNodeObject;
		}[],
		edges?: {
			id: string;
			edgeRelationship: string;
			edgeObject?: IJsonLdNodeObject;
		}[],
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);
		Guards.stringValue(this.CLASS_NAME, nameof(userIdentity), userIdentity);
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

			if (Is.object(vertexObject)) {
				const validationFailures: IValidationFailure[] = [];
				await JsonLdHelper.validate(vertexObject, validationFailures);
				Validation.asValidationError(this.CLASS_NAME, nameof(vertexObject), validationFailures);
			}

			const context: IAuditableItemGraphServiceContext = {
				now: new Date(Date.now()).toISOString(),
				userIdentity,
				nodeIdentity
			};

			delete vertexEntity.aliasIndex;
			const originalEntity = ObjectHelper.clone(vertexEntity);
			const newEntity = ObjectHelper.clone(vertexEntity);

			newEntity.vertexObject = vertexObject;

			await this.updateAliasList(context, newEntity, aliases);
			await this.updateResourceList(context, newEntity, resources);
			await this.updateEdgeList(context, newEntity, edges);

			const changes = await this.addChangeset(context, originalEntity, newEntity, false);
			if (changes) {
				newEntity.dateModified = context.now;
				await this._vertexStorage.set({
					...newEntity,
					aliasIndex: newEntity.aliases
						?.map(a => a.id)
						.join("||")
						.toLowerCase()
				});
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

			let changesetsResult;
			do {
				changesetsResult = await this._changesetStorage.query(
					{
						property: "vertexId",
						value: vertexId,
						comparison: ComparisonOperator.Equals
					},
					[
						{
							property: "dateCreated",
							sortDirection: SortDirection.Ascending
						}
					],
					undefined,
					changesetsResult?.cursor
				);

				for (const changeset of changesetsResult.entities) {
					if (Is.stringValue(changeset.proofId)) {
						await this._immutableProofComponent.removeImmutable(changeset.proofId, nodeIdentity);
						delete changeset.proofId;
						await this._changesetStorage.set(changeset as AuditableItemGraphChangeset);
					}
				}
			} while (Is.stringValue(changesetsResult.cursor));
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
	 * @param properties The properties to return, if not provided defaults to id, created, aliases and object.
	 * @param cursor The cursor to request the next page of entities.
	 * @param pageSize The maximum number of entities in a page.
	 * @returns The entities, which can be partial if a limited keys list was provided.
	 */
	public async query(
		options?: {
			id?: string;
			idMode?: "id" | "alias" | "both";
		},
		orderBy?: keyof Pick<IAuditableItemGraphVertex, "dateCreated" | "dateModified">,
		orderByDirection?: SortDirection,
		properties?: (keyof IAuditableItemGraphVertex)[],
		cursor?: string,
		pageSize?: number
	): Promise<IAuditableItemGraphVertexList> {
		try {
			const propertiesToReturn: (keyof IAuditableItemGraphVertex)[] = properties ?? [
				"id",
				"dateCreated",
				"dateModified",
				"aliases",
				"vertexObject"
			];
			const conditions = [];
			const orderProperty = orderBy ?? "dateCreated";
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

			if (!propertiesToReturn.includes("id")) {
				propertiesToReturn.unshift("id");
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

			const models: IAuditableItemGraphVertex[] = results.entities.map(e =>
				this.vertexEntityToJsonLd(e as AuditableItemGraphVertex)
			);

			const vertexList: IAuditableItemGraphVertexList = {
				"@context": [AuditableItemGraphTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
				type: AuditableItemGraphTypes.VertexList,
				vertices: models,
				cursor: results.cursor
			};

			const compacted = await JsonLdProcessor.compact(vertexList, vertexList["@context"]);
			return compacted as IAuditableItemGraphVertexList;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "queryingFailed", undefined, error);
		}
	}

	/**
	 * Map the vertex entity to JSON-LD.
	 * @param vertexEntity The vertex entity.
	 * @returns The model.
	 * @internal
	 */
	private vertexEntityToJsonLd(vertexEntity: AuditableItemGraphVertex): IAuditableItemGraphVertex {
		const model: IAuditableItemGraphVertex = {
			"@context": [
				AuditableItemGraphTypes.ContextRoot,
				ImmutableProofTypes.ContextRoot,
				SchemaOrgTypes.ContextRoot
			],
			type: AuditableItemGraphTypes.Vertex,
			id: vertexEntity.id,
			dateCreated: vertexEntity.dateCreated,
			dateModified: vertexEntity.dateModified,
			nodeIdentity: vertexEntity.nodeIdentity,
			vertexObject: vertexEntity.vertexObject
		};

		if (Is.arrayValue(vertexEntity.aliases)) {
			model.aliases ??= [];
			for (const aliasEntity of vertexEntity.aliases) {
				const aliasModel: IAuditableItemGraphAlias = {
					"@context": [AuditableItemGraphTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
					type: AuditableItemGraphTypes.Alias,
					id: aliasEntity.id,
					aliasFormat: aliasEntity.aliasFormat,
					dateCreated: aliasEntity.dateCreated,
					dateModified: aliasEntity.dateModified,
					dateDeleted: aliasEntity.dateDeleted,
					aliasObject: aliasEntity.aliasObject
				};
				model.aliases.push(aliasModel);
			}
		}

		if (Is.arrayValue(vertexEntity.resources)) {
			model.resources ??= [];
			for (const resourceEntity of vertexEntity.resources) {
				const resourceModel: IAuditableItemGraphResource = {
					"@context": [AuditableItemGraphTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
					type: AuditableItemGraphTypes.Resource,
					id: resourceEntity.id,
					dateCreated: resourceEntity.dateCreated,
					dateModified: resourceEntity.dateModified,
					dateDeleted: resourceEntity.dateDeleted,
					resourceObject: resourceEntity.resourceObject
				};
				model.resources.push(resourceModel);
			}
		}

		if (Is.arrayValue(vertexEntity.edges)) {
			model.edges ??= [];
			for (const edgeEntity of vertexEntity.edges) {
				const edgeModel: IAuditableItemGraphEdge = {
					"@context": [AuditableItemGraphTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
					type: AuditableItemGraphTypes.Edge,
					id: edgeEntity.id,
					dateCreated: edgeEntity.dateCreated,
					dateModified: edgeEntity.dateModified,
					dateDeleted: edgeEntity.dateDeleted,
					edgeRelationship: edgeEntity.edgeRelationship,
					edgeObject: edgeEntity.edgeObject
				};
				model.edges.push(edgeModel);
			}
		}

		return model;
	}

	/**
	 * Map the changeset entity to a JSON-LD.
	 * @param changesetEntity The changeset entity.
	 * @returns The model.
	 * @internal
	 */
	private changesetEntityToJsonLd(
		changesetEntity: AuditableItemGraphChangeset
	): IAuditableItemGraphChangeset {
		const model: IAuditableItemGraphChangeset = {
			"@context": [AuditableItemGraphTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
			type: AuditableItemGraphTypes.Changeset,
			id: changesetEntity.id,
			dateCreated: changesetEntity.dateCreated,
			userIdentity: changesetEntity.userIdentity,
			patches: changesetEntity.patches.map(p => ({
				"@context": [AuditableItemGraphTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
				type: AuditableItemGraphTypes.PatchOperation,
				patchOperation: p.op,
				patchPath: p.path,
				patchFrom: p.from,
				patchValue: p.value
			})),
			proofId: changesetEntity.proofId
		};

		return model;
	}

	/**
	 * Update the aliases of a vertex model.
	 * @param context The context for the operation.
	 * @param vertex The vertex.
	 * @param aliases The aliases to update.
	 * @internal
	 */
	private async updateAliasList(
		context: IAuditableItemGraphServiceContext,
		vertex: AuditableItemGraphVertex,
		aliases?: {
			id: string;
			aliasFormat?: string;
			aliasObject?: IJsonLdNodeObject;
		}[]
	): Promise<void> {
		const active = vertex.aliases?.filter(a => Is.empty(a.dateDeleted)) ?? [];

		// The active aliases that are not in the update list should be marked as deleted.
		if (Is.arrayValue(active)) {
			for (const alias of active) {
				if (!aliases?.find(a => a.id === alias.id)) {
					alias.dateDeleted = context.now;
				}
			}
		}

		if (Is.arrayValue(aliases)) {
			for (const alias of aliases) {
				await this.updateAlias(context, vertex, alias);
			}
		}
	}

	/**
	 * Update an alias in the vertex.
	 * @param context The context for the operation.
	 * @param vertex The vertex.
	 * @param alias The alias.
	 * @internal
	 */
	private async updateAlias(
		context: IAuditableItemGraphServiceContext,
		vertex: AuditableItemGraphVertex,
		alias: {
			id: string;
			aliasFormat?: string;
			aliasObject?: IJsonLdNodeObject;
		}
	): Promise<void> {
		Guards.object(this.CLASS_NAME, nameof(alias), alias);
		Guards.stringValue(this.CLASS_NAME, nameof(alias.id), alias.id);

		if (Is.object(alias.aliasObject)) {
			const validationFailures: IValidationFailure[] = [];
			await JsonLdHelper.validate(alias.aliasObject, validationFailures);
			Validation.asValidationError(this.CLASS_NAME, nameof(alias.aliasObject), validationFailures);
		}

		// Try to find an existing alias with the same id.
		const existing = vertex.aliases?.find(a => a.id === alias.id);

		if (Is.empty(existing) || !Is.empty(existing?.dateDeleted)) {
			// Did not find a matching item, or found one which is deleted.
			vertex.aliases ??= [];

			const model: AuditableItemGraphAlias = {
				id: alias.id,
				aliasFormat: alias.aliasFormat,
				dateCreated: context.now,
				aliasObject: alias.aliasObject
			};

			vertex.aliases.push(model);
		} else if (
			existing.aliasFormat !== alias.aliasFormat ||
			!ObjectHelper.equal(existing.aliasObject, alias.aliasObject, false)
		) {
			// Existing alias found, update the aliasObject.
			existing.dateModified = context.now;
			existing.aliasFormat = alias.aliasFormat;
			existing.aliasObject = alias.aliasObject;
		}
	}

	/**
	 * Update the resources of a vertex.
	 * @param context The context for the operation.
	 * @param vertex The vertex.
	 * @param resources The resources to update.
	 * @internal
	 */
	private async updateResourceList(
		context: IAuditableItemGraphServiceContext,
		vertex: AuditableItemGraphVertex,
		resources?: {
			id: string;
			resourceObject?: IJsonLdNodeObject;
		}[]
	): Promise<void> {
		const active = vertex.resources?.filter(r => Is.empty(r.dateDeleted)) ?? [];

		// The active resources that are not in the update list should be marked as deleted.
		if (Is.arrayValue(active)) {
			for (const resource of active) {
				if (!resources?.find(a => a.id === resource.id)) {
					resource.dateDeleted = context.now;
				}
			}
		}

		if (Is.arrayValue(resources)) {
			for (const resource of resources) {
				await this.updateResource(context, vertex, resource);
			}
		}
	}

	/**
	 * Add a resource to the vertex.
	 * @param context The context for the operation.
	 * @param vertex The vertex.
	 * @param resource The resource.
	 * @internal
	 */
	private async updateResource(
		context: IAuditableItemGraphServiceContext,
		vertex: AuditableItemGraphVertex,
		resource: {
			id: string;
			resourceObject?: IJsonLdNodeObject;
		}
	): Promise<void> {
		Guards.object(this.CLASS_NAME, nameof(resource), resource);
		Guards.stringValue(this.CLASS_NAME, nameof(resource.id), resource.id);

		if (Is.object(resource.resourceObject)) {
			const validationFailures: IValidationFailure[] = [];
			await JsonLdHelper.validate(resource.resourceObject, validationFailures);
			Validation.asValidationError(
				this.CLASS_NAME,
				nameof(resource.resourceObject),
				validationFailures
			);
		}

		// Try to find an existing resource with the same id.
		const existing = vertex.resources?.find(r => r.id === resource.id);

		if (Is.empty(existing) || !Is.empty(existing?.dateDeleted)) {
			// Did not find a matching item, or found one which is deleted.
			vertex.resources ??= [];

			const model: AuditableItemGraphResource = {
				id: resource.id,
				dateCreated: context.now,
				resourceObject: resource.resourceObject
			};

			vertex.resources.push(model);
		} else if (!ObjectHelper.equal(existing.resourceObject, resource.resourceObject, false)) {
			// Existing resource found, update the resourceObject.
			existing.dateModified = context.now;
			existing.resourceObject = resource.resourceObject;
		}
	}

	/**
	 * Update the edges of a vertex.
	 * @param context The context for the operation.
	 * @param vertex The vertex.
	 * @param edges The edges to update.
	 * @internal
	 */
	private async updateEdgeList(
		context: IAuditableItemGraphServiceContext,
		vertex: AuditableItemGraphVertex,
		edges?: {
			id: string;
			edgeRelationship: string;
			edgeObject?: IJsonLdNodeObject;
		}[]
	): Promise<void> {
		const active = vertex.edges?.filter(e => Is.empty(e.dateDeleted)) ?? [];

		// The active edges that are not in the update list should be marked as deleted.
		if (Is.arrayValue(active)) {
			for (const edge of active) {
				if (!edges?.find(a => a.id === edge.id)) {
					edge.dateDeleted = context.now;
				}
			}
		}

		if (Is.arrayValue(edges)) {
			for (const edge of edges) {
				await this.updateEdge(context, vertex, edge);
			}
		}
	}

	/**
	 * Add an edge to the vertex.
	 * @param context The context for the operation.
	 * @param vertex The vertex.
	 * @param edge The edge.
	 * @internal
	 */
	private async updateEdge(
		context: IAuditableItemGraphServiceContext,
		vertex: AuditableItemGraphVertex,
		edge: {
			id: string;
			edgeRelationship: string;
			edgeObject?: IJsonLdNodeObject;
		}
	): Promise<void> {
		Guards.object(this.CLASS_NAME, nameof(edge), edge);
		Guards.stringValue(this.CLASS_NAME, nameof(edge.id), edge.id);
		Guards.stringValue(this.CLASS_NAME, nameof(edge.edgeRelationship), edge.edgeRelationship);

		const validationFailures: IValidationFailure[] = [];
		if (edge.id === vertex.id) {
			validationFailures.push({
				property: "id",
				reason: `validation.${StringHelper.camelCase(this.CLASS_NAME)}.edgeIdSameAsVertexId`,
				properties: {
					id: edge.id
				}
			});
		}
		if (Is.object(edge.edgeObject)) {
			await JsonLdHelper.validate(edge.edgeObject, validationFailures);
		}
		Validation.asValidationError(this.CLASS_NAME, nameof(edge.edgeObject), validationFailures);

		// Try to find an existing edge with the same id.
		const existing = vertex.edges?.find(r => r.id === edge.id);

		if (Is.empty(existing) || !Is.empty(existing?.dateDeleted)) {
			// Did not find a matching item, or found one which is deleted.
			vertex.edges ??= [];

			const model: AuditableItemGraphEdge = {
				id: edge.id,
				dateCreated: context.now,
				edgeObject: edge.edgeObject,
				edgeRelationship: edge.edgeRelationship
			};

			vertex.edges.push(model);
		} else if (
			existing.edgeRelationship !== edge.edgeRelationship ||
			!ObjectHelper.equal(existing.edgeObject, edge.edgeObject, false)
		) {
			// Existing resource found, update the edgeObject.
			existing.dateModified = context.now;
			existing.edgeRelationship = edge.edgeRelationship;
			existing.edgeObject = edge.edgeObject;
		}
	}

	/**
	 * Add a changeset to the vertex and generate the associated verifications.
	 * @param context The context for the operation.
	 * @param original The original vertex.
	 * @param updated The updated vertex.
	 * @param isNew Whether this is a new item.
	 * @returns True if there were changes.
	 * @internal
	 */
	private async addChangeset(
		context: IAuditableItemGraphServiceContext,
		original: AuditableItemGraphVertex,
		updated: AuditableItemGraphVertex,
		isNew: boolean
	): Promise<boolean> {
		const patches = JsonHelper.diff(original, updated);

		// If there is a diff set or this is the first time the item is created.
		if (patches.length > 0 || isNew) {
			const changesetEntity: AuditableItemGraphChangeset = {
				id: Converter.bytesToHex(RandomHelper.generate(32), false),
				vertexId: updated.id,
				dateCreated: context.now,
				userIdentity: context.userIdentity,
				patches,
				proofId: ""
			};

			// Create the JSON-LD object we want to use for the proof
			// this is a subset of fixed properties from the changeset object.
			const reducedChangesetJsonLd = await this.changesetEntityToJsonLd({
				...(ObjectHelper.pick(
					changesetEntity,
					AuditableItemGraphService._PROOF_KEYS_CHANGESET
				) as AuditableItemGraphChangeset),
				id: `${AuditableItemGraphService.NAMESPACE}:${updated.id}:${AuditableItemGraphService.NAMESPACE_CHANGESET}:${changesetEntity.id}`
			});

			// Create the proof for the changeset object
			changesetEntity.proofId = await this._immutableProofComponent.create(
				reducedChangesetJsonLd as unknown as IJsonLdNodeObject,
				context.userIdentity,
				context.nodeIdentity
			);

			// Link the immutable storage id to the changeset
			await this._changesetStorage.set(changesetEntity);

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
		verifySignatureDepth: VerifyDepth
	): Promise<{
		verified: boolean;
		changesets: IAuditableItemGraphChangeset[];
	}> {
		const changesets: IAuditableItemGraphChangeset[] = [];

		let changesetsResult;
		let verified = true;

		do {
			changesetsResult = await this._changesetStorage.query(
				{
					property: "vertexId",
					value: vertex.id,
					comparison: ComparisonOperator.Equals
				},
				[
					{
						property: "dateCreated",
						sortDirection: SortDirection.Ascending
					}
				],
				undefined,
				changesetsResult?.cursor
			);

			const storedChangesets = changesetsResult.entities as AuditableItemGraphChangeset[];
			if (Is.arrayValue(storedChangesets)) {
				for (let i = 0; i < storedChangesets.length; i++) {
					const storedChangeset = storedChangesets[i];

					const storedChangesetJsonLd = this.changesetEntityToJsonLd(storedChangeset);
					changesets.push(storedChangesetJsonLd);

					// If we are verifying all signatures
					// or this is the last changeset (cursor is empty)
					// and the changeset has a proofId, then verify the proof.
					if (
						verifySignatureDepth === VerifyDepth.All ||
						(verifySignatureDepth === VerifyDepth.Current &&
							!Is.stringValue(changesetsResult.cursor) &&
							i === storedChangesets.length - 1)
					) {
						if (!Is.stringValue(storedChangeset.proofId)) {
							verified = false;
							storedChangesetJsonLd.verification = {
								"@context": ImmutableProofTypes.ContextRoot,
								type: ImmutableProofTypes.ImmutableProofVerification,
								verified: false,
								failure: ImmutableProofFailure.ProofMissing
							};
						} else {
							// Create the JSON-LD object we want to use for the proof
							// this is a subset of fixed properties from the changeset object.
							const reducedChangesetJsonLd = await this.changesetEntityToJsonLd(
								ObjectHelper.pick(
									storedChangeset,
									AuditableItemGraphService._PROOF_KEYS_CHANGESET
								) as AuditableItemGraphChangeset
							);

							// Verify the proof for the changeset object
							storedChangesetJsonLd.verification = await this._immutableProofComponent.verify(
								storedChangeset.proofId,
								reducedChangesetJsonLd as unknown as IJsonLdNodeObject
							);

							if (!storedChangesetJsonLd.verification.verified) {
								verified = false;
							}
						}
					}
				}
			}
		} while (Is.stringValue(changesetsResult.cursor));

		return {
			verified,
			changesets
		};
	}
}
