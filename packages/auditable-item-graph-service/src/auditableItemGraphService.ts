// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuditableItemGraphTypes,
	AuditableItemGraphVerificationState,
	VerifyDepth,
	type IAuditableItemGraphAlias,
	type IAuditableItemGraphChangeset,
	type IAuditableItemGraphComponent,
	type IAuditableItemGraphCredential,
	type IAuditableItemGraphEdge,
	type IAuditableItemGraphPatchOperation,
	type IAuditableItemGraphResource,
	type IAuditableItemGraphVerification,
	type IAuditableItemGraphVertex,
	type IAuditableItemGraphVertexList
} from "@twin.org/auditable-item-graph-models";
import {
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
	type IPatchOperation,
	type IValidationFailure
} from "@twin.org/core";
import { Blake2b } from "@twin.org/crypto";
import { JsonLdHelper, JsonLdProcessor, type IJsonLdNodeObject } from "@twin.org/data-json-ld";
import { SchemaOrgDataTypes, SchemaOrgTypes } from "@twin.org/data-schema-org";
import { ComparisonOperator, LogicalOperator, SortDirection } from "@twin.org/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import {
	DocumentHelper,
	IdentityConnectorFactory,
	type IIdentityConnector
} from "@twin.org/identity-models";
import {
	ImmutableStorageConnectorFactory,
	type IImmutableStorageConnector
} from "@twin.org/immutable-storage-models";
import { nameof } from "@twin.org/nameof";
import type { IDidVerifiableCredential } from "@twin.org/standards-w3c-did";
import {
	VaultConnectorFactory,
	VaultEncryptionType,
	type IVaultConnector
} from "@twin.org/vault-models";
import { Jwt } from "@twin.org/web";
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
	 * The entity storage for changesets.
	 * @internal
	 */
	private readonly _changesetStorage: IEntityStorageConnector<AuditableItemGraphChangeset>;

	/**
	 * The immutable storage for the integrity data.
	 * @internal
	 */
	private readonly _immutableStorage: IImmutableStorageConnector;

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
	 * @param options.changesetEntityStorageType The entity storage for changesets, defaults to "auditable-item-graph-changeset".
	 * @param options.immutableStorageType The immutable storage for audit trail, defaults to "auditable-item-graph".
	 * @param options.identityConnectorType The identity connector type, defaults to "identity".
	 */
	constructor(options?: {
		vaultConnectorType?: string;
		vertexEntityStorageType?: string;
		immutableStorageType?: string;
		changesetEntityStorageType?: string;
		identityConnectorType?: string;
		config?: IAuditableItemGraphServiceConfig;
	}) {
		this._vaultConnector = VaultConnectorFactory.get(options?.vaultConnectorType ?? "vault");

		this._vertexStorage = EntityStorageConnectorFactory.get(
			options?.vertexEntityStorageType ?? StringHelper.kebabCase(nameof<AuditableItemGraphVertex>())
		);

		this._changesetStorage = EntityStorageConnectorFactory.get(
			options?.changesetEntityStorageType ??
				StringHelper.kebabCase(nameof<AuditableItemGraphChangeset>())
		);

		this._immutableStorage = ImmutableStorageConnectorFactory.get(
			options?.immutableStorageType ?? "auditable-item-graph"
		);

		this._identityConnector = IdentityConnectorFactory.get(
			options?.identityConnectorType ?? "identity"
		);

		this._config = options?.config ?? {};
		this._vaultKeyId = this._config.vaultKeyId ?? "auditable-item-graph";
		this._assertionMethodId = this._config.assertionMethodId ?? "auditable-item-graph";
		this._enableIntegrityCheck = this._config.enableImmutableDiffs ?? false;

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
			await this.addChangeset(context, originalEntity, vertex);

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

			const vertexModel = this.vertexEntityToModel(vertexEntity);

			const includeChangesets = options?.includeChangesets ?? false;
			const verifySignatureDepth = options?.verifySignatureDepth ?? "none";

			let verified: boolean | undefined;
			let changesets: IAuditableItemGraphChangeset[] | undefined;

			if (
				verifySignatureDepth === VerifyDepth.Current ||
				verifySignatureDepth === VerifyDepth.All ||
				includeChangesets
			) {
				const verifyResult = await this.verifyChangesets(
					vertexModel,
					verifySignatureDepth,
					includeChangesets
				);
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

			const changes = await this.addChangeset(context, originalEntity, newEntity);

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
					if (Is.stringValue(changeset.immutableStorageId)) {
						await this._immutableStorage.remove(nodeIdentity, changeset.immutableStorageId);
						delete changeset.immutableStorageId;
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
				this.vertexEntityToModel(e as AuditableItemGraphVertex)
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
	 * Map the vertex entity to a model.
	 * @param vertexEntity The vertex entity.
	 * @returns The model.
	 * @internal
	 */
	private vertexEntityToModel(vertexEntity: AuditableItemGraphVertex): IAuditableItemGraphVertex {
		const model: IAuditableItemGraphVertex = {
			"@context": [AuditableItemGraphTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
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
	 * Map the changeset entity to a model.
	 * @param changesetEntity The changeset entity.
	 * @returns The model.
	 * @internal
	 */
	private changesetEntityToModel(
		changesetEntity: AuditableItemGraphChangeset
	): IAuditableItemGraphChangeset {
		const model: IAuditableItemGraphChangeset = {
			"@context": [AuditableItemGraphTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
			type: AuditableItemGraphTypes.Changeset,
			hash: changesetEntity.hash,
			signature: changesetEntity.signature,
			immutableStorageId: changesetEntity.immutableStorageId,
			dateCreated: changesetEntity.dateCreated,
			userIdentity: changesetEntity.userIdentity,
			patches: changesetEntity.patches.map(p => ({
				"@context": [AuditableItemGraphTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
				type: AuditableItemGraphTypes.PatchOperation,
				patchOperation: p.op,
				patchPath: p.path,
				patchFrom: p.from,
				patchValue: p.value
			}))
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

		if (Is.object(edge.edgeObject)) {
			const validationFailures: IValidationFailure[] = [];
			await JsonLdHelper.validate(edge.edgeObject, validationFailures);
			Validation.asValidationError(this.CLASS_NAME, nameof(edge.edgeObject), validationFailures);
		}

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
	 * @returns True if there were changes.
	 * @internal
	 */
	private async addChangeset(
		context: IAuditableItemGraphServiceContext,
		original: AuditableItemGraphVertex,
		updated: AuditableItemGraphVertex
	): Promise<boolean> {
		const patches = JsonHelper.diff(original, updated);

		const lastChangesetResult = await this._changesetStorage.query(
			{
				property: "vertexId",
				value: original.id,
				comparison: ComparisonOperator.Equals
			},
			[
				{
					property: "dateCreated",
					sortDirection: SortDirection.Descending
				}
			],
			undefined,
			undefined,
			1
		);

		const lastChangeset = lastChangesetResult.entities[0];

		if (patches.length > 0 || Is.empty(lastChangeset)) {
			const changeSetHash = this.calculateChangesetHash(
				context.now,
				context.userIdentity,
				patches,
				Is.stringValue(lastChangeset?.hash)
					? Converter.base64ToBytes(lastChangeset.hash)
					: undefined
			);

			// Generate the signature for the changeset using the hash.
			const signature = await this._vaultConnector.sign(
				`${context.nodeIdentity}/${this._vaultKeyId}`,
				changeSetHash
			);

			// Create the data for the verifiable credential
			const credentialData: IAuditableItemGraphCredential = {
				"@context": [AuditableItemGraphTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
				type: AuditableItemGraphTypes.Credential,
				dateCreated: context.now,
				userIdentity: context.userIdentity,
				signature: Converter.bytesToBase64(signature),
				hash: Converter.bytesToBase64(changeSetHash)
			};

			// If integrity check is enabled add an encrypted version of the changes to the credential data.
			if (this._enableIntegrityCheck) {
				const canonical = JsonHelper.canonicalize({
					patches
				});
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
				new Urn(AuditableItemGraphService.NAMESPACE, original.id).toString(),
				credentialData
			);

			// Store the verifiable credential immutably
			const immutableStorageId = await this._immutableStorage.store(
				context.nodeIdentity,
				Converter.utf8ToBytes(verifiableCredential.jwt)
			);

			// Link the immutable storage id to the changeset
			await this._changesetStorage.set({
				hash: credentialData.hash,
				signature: credentialData.signature,
				vertexId: updated.id,
				dateCreated: context.now,
				userIdentity: context.userIdentity,
				patches,
				immutableStorageId
			});

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
		verifySignatureDepth: VerifyDepth,
		includeChangesets: boolean
	): Promise<{
		verified?: boolean;
		changesets?: IAuditableItemGraphChangeset[];
	}> {
		let verified: boolean = true;
		const changesets: IAuditableItemGraphChangeset[] = [];

		let changesetsResult;
		let lastHash: Uint8Array | undefined;

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
					const storedChangesetModel = this.changesetEntityToModel(storedChangeset);

					changesets.push(storedChangesetModel);

					if (verifySignatureDepth !== VerifyDepth.None) {
						const verification: IAuditableItemGraphVerification = {
							"@context": [AuditableItemGraphTypes.ContextRoot, SchemaOrgTypes.ContextRoot],
							type: AuditableItemGraphTypes.Verification,
							state: AuditableItemGraphVerificationState.Ok,
							dateCreated: storedChangeset.dateCreated
						};
						storedChangesetModel.verification = verification;

						const calculatedHash = this.calculateChangesetHash(
							storedChangeset.dateCreated,
							storedChangeset.userIdentity,
							storedChangeset.patches,
							lastHash
						);

						lastHash = calculatedHash;

						if (Converter.bytesToBase64(calculatedHash) !== storedChangeset.hash) {
							verification.state = AuditableItemGraphVerificationState.HashMismatch;
						} else if (
							verifySignatureDepth === VerifyDepth.All ||
							(verifySignatureDepth === VerifyDepth.Current &&
								!Is.stringValue(changesetsResult.cursor) &&
								i === storedChangesets.length - 1)
						) {
							let immutablePatches: IPatchOperation[] | undefined;
							let immutableNodeIdentity: string | undefined;
							let immutableUserIdentity: string | undefined;

							const signatureVerified = await this._vaultConnector.verify(
								`${vertex.nodeIdentity}/${this._vaultKeyId}`,
								calculatedHash,
								Converter.base64ToBytes(storedChangeset.signature)
							);

							if (!signatureVerified) {
								verification.state = AuditableItemGraphVerificationState.SignatureNotVerified;
							} else if (Is.stringValue(storedChangeset.immutableStorageId)) {
								// Get the vc from the immutable data store
								const verifiableCredentialBytes = await this._immutableStorage.get(
									storedChangeset.immutableStorageId
								);
								const verifiableCredentialJwt = Converter.bytesToUtf8(verifiableCredentialBytes);
								const decodedJwt = await Jwt.decode(verifiableCredentialJwt);

								// Verify the credential
								const verificationResult = (await this._identityConnector.checkVerifiableCredential(
									verifiableCredentialJwt
								)) as {
									revoked: boolean;
									verifiableCredential?: IDidVerifiableCredential<IAuditableItemGraphCredential>;
								};

								if (verificationResult.revoked) {
									verification.state = AuditableItemGraphVerificationState.CredentialRevoked;
								} else {
									// Credential is not revoked so check the signature
									const credentialData = Is.array(
										verificationResult.verifiableCredential?.credentialSubject
									)
										? verificationResult.verifiableCredential?.credentialSubject[0]
										: (verificationResult.verifiableCredential?.credentialSubject ?? {
												"@context": [
													AuditableItemGraphTypes.ContextRoot,
													SchemaOrgTypes.ContextRoot
												],
												type: AuditableItemGraphTypes.Credential,
												dateCreated: "",
												userIdentity: "",
												signature: "",
												hash: ""
											});

									immutableNodeIdentity = DocumentHelper.parse(decodedJwt.header?.kid ?? "").id;
									immutableUserIdentity = credentialData.userIdentity;

									if (credentialData.hash !== storedChangeset.hash) {
										// Does the immutable hash match the local one we calculated
										verification.state = AuditableItemGraphVerificationState.ImmutableHashMismatch;
									} else if (credentialData.signature !== storedChangeset.signature) {
										// Does the immutable signature match the local one we calculated
										verification.state =
											AuditableItemGraphVerificationState.ImmutableSignatureMismatch;
									} else if (Is.stringValue(credentialData.integrity)) {
										const decrypted = await this._vaultConnector.decrypt(
											`${vertex.nodeIdentity}/${this._vaultKeyId}`,
											VaultEncryptionType.ChaCha20Poly1305,
											Converter.base64ToBytes(credentialData.integrity)
										);

										const canonical = Converter.bytesToUtf8(decrypted);
										const calculatedIntegrity = {
											patches: storedChangeset.patches
										};
										if (canonical !== JsonHelper.canonicalize(calculatedIntegrity)) {
											verification.state =
												AuditableItemGraphVerificationState.IntegrityDataMismatch;
										}
										const immutableIntegrity: { patches: IAuditableItemGraphPatchOperation[] } =
											JSON.parse(canonical);
										immutablePatches = immutableIntegrity.patches.map(p => ({
											op: p.patchOperation,
											from: p.patchFrom,
											path: p.patchPath,
											value: p.patchValue
										}));
									}
								}
							}

							// If there was a failure add some additional information
							if (verification.state !== AuditableItemGraphVerificationState.Ok) {
								verification.stateProperties = {
									hash: storedChangeset.hash,
									integrityPatches: immutablePatches,
									integrityNodeIdentity: immutableNodeIdentity,
									integrityUserIdentity: immutableUserIdentity
								};
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

	/**
	 * Calculate the changeset hash.
	 * @param now The current epoch.
	 * @param userIdentity The user identity.
	 * @param patches The patches.
	 * @param lastHash The last hash.
	 * @returns The hash.
	 * @internal
	 */
	private calculateChangesetHash(
		now: string,
		userIdentity: string,
		patches: IPatchOperation[],
		lastHash: Uint8Array | undefined
	): Uint8Array {
		const b2b = new Blake2b(Blake2b.SIZE_256);

		// If there is a previous changeset, add the most recent one to the new hash.
		// This provides a link to previous integrity checks.
		if (Is.uint8Array(lastHash)) {
			b2b.update(lastHash);
		}

		// Add the epoch and the identity in to the signature
		b2b.update(Converter.utf8ToBytes(now));
		b2b.update(Converter.utf8ToBytes(userIdentity));

		// Add the patch operations to the hash.
		b2b.update(ObjectHelper.toBytes(patches));

		return b2b.digest();
	}
}
