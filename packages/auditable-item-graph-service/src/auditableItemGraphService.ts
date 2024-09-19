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
	type JsonReturnType
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
import {
	JsonLdHelper,
	JsonLdProcessor,
	type IJsonLdDocument,
	type IJsonLdJsonObject,
	type IJsonLdNodeObject
} from "@twin.org/data-json-ld";
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
	}

	/**
	 * Create a new graph vertex.
	 * @param metadata The metadata for the vertex as JSON-LD.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param resources The resources attached to the vertex.
	 * @param edges The edges connected to the vertex.
	 * @param userIdentity The identity to create the auditable item graph operation with.
	 * @param nodeIdentity The node identity to include in the auditable item graph.
	 * @returns The id of the new graph item.
	 */
	public async create(
		metadata?: IJsonLdNodeObject,
		aliases?: {
			id: string;
			format?: string;
			metadata?: IJsonLdNodeObject;
		}[],
		resources?: {
			id: string;
			metadata?: IJsonLdNodeObject;
		}[],
		edges?: {
			id: string;
			relationship: string;
			metadata?: IJsonLdNodeObject;
		}[],
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<string> {
		Guards.stringValue(this.CLASS_NAME, nameof(userIdentity), userIdentity);
		Guards.stringValue(this.CLASS_NAME, nameof(nodeIdentity), nodeIdentity);

		try {
			if (Is.object(metadata)) {
				const validationFailures: IValidationFailure[] = [];
				await JsonLdHelper.validate(metadata, validationFailures);
				Validation.asValidationError(this.CLASS_NAME, "metadata", validationFailures);
			}

			const id = Converter.bytesToHex(RandomHelper.generate(32), false);

			const context: IAuditableItemGraphServiceContext = {
				now: Date.now(),
				userIdentity,
				nodeIdentity
			};

			const vertexModel: IAuditableItemGraphVertex = {
				id,
				nodeIdentity,
				created: context.now,
				updated: context.now
			};
			const originalModel = ObjectHelper.clone(vertexModel);

			vertexModel.metadata = metadata;

			await this.updateAliasList(context, vertexModel, aliases);
			await this.updateResourceList(context, vertexModel, resources);
			await this.updateEdgeList(context, vertexModel, edges);

			await this.addChangeset(context, originalModel, vertexModel);

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
	 * @param options.includeDeleted Whether to include deleted/updated aliases, resource, edges, defaults to false.
	 * @param options.includeChangesets Whether to include the changesets of the vertex, defaults to false.
	 * @param options.verifySignatureDepth How many signatures to verify, defaults to "none".
	 * @param responseType The response type to return, defaults to application/json.
	 * @throws NotFoundError if the vertex is not found.
	 */
	public async get<T extends "json" | "jsonld" = "json">(
		id: string,
		options?: {
			includeDeleted?: boolean;
			includeChangesets?: boolean;
			verifySignatureDepth?: VerifyDepth;
		},
		responseType?: T
	): Promise<
		JsonReturnType<
			T,
			IAuditableItemGraphVertex & {
				verified?: boolean;
				changesetsVerification?: IAuditableItemGraphVerification[];
			},
			IJsonLdDocument
		>
	> {
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
			let changesetsVerification: IAuditableItemGraphVerification[] | undefined;
			let changesets: IAuditableItemGraphChangeset[] | undefined;

			if (
				verifySignatureDepth === VerifyDepth.Current ||
				verifySignatureDepth === VerifyDepth.All ||
				includeChangesets
			) {
				const verifyResult = await this.verifyChangesets(vertexModel, verifySignatureDepth);
				verified = verifyResult.verified;
				changesetsVerification = verifyResult.changesetsVerification;
				changesets = verifyResult.changesets;
			}

			if (!(options?.includeDeleted ?? false)) {
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
					}
				}
				if (Is.arrayValue(vertexModel.edges)) {
					vertexModel.edges = vertexModel.edges.filter(r => Is.undefined(r.deleted));
					if (vertexModel.edges.length === 0) {
						delete vertexModel.edges;
					}
				}
			}

			if (includeChangesets) {
				vertexModel.changesets = changesets;
			}

			if (responseType === "jsonld") {
				const vertexJsonLd = this.modelToJsonLd(vertexModel);
				if (verifySignatureDepth !== VerifyDepth.None) {
					vertexJsonLd.verified = verified;
					vertexJsonLd.changesetsVerification = (changesetsVerification ?? []).map(v =>
						this.modelVerificationToJsonLd(v)
					);
				}

				const compacted = await JsonLdProcessor.compact(vertexJsonLd, {
					"@context": AuditableItemGraphTypes.ContextUri
				});

				return compacted as JsonReturnType<
					T,
					IAuditableItemGraphVertex & {
						verified?: boolean;
						changesetsVerification?: IAuditableItemGraphVerification[];
					},
					IJsonLdDocument
				>;
			}

			const result: JsonReturnType<T, IAuditableItemGraphVertex, IJsonLdDocument> & {
				verified?: boolean;
				changesetsVerification?: IAuditableItemGraphVerification[];
			} = vertexModel;

			if (verifySignatureDepth !== VerifyDepth.None) {
				result.verified = verified;
				result.changesetsVerification = changesetsVerification;
			}

			return result;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "getFailed", undefined, error);
		}
	}

	/**
	 * Update a graph vertex.
	 * @param id The id of the vertex to update.
	 * @param metadata The metadata for the vertex.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param resources The resources attached to the vertex.
	 * @param edges The edges connected to the vertex.
	 * @param userIdentity The identity to create the auditable item graph operation with.
	 * @param nodeIdentity The node identity to include in the auditable item graph.
	 * @returns Nothing.
	 */
	public async update(
		id: string,
		metadata?: IJsonLdNodeObject,
		aliases?: {
			id: string;
			format?: string;
			metadata?: IJsonLdNodeObject;
		}[],
		resources?: {
			id: string;
			metadata?: IJsonLdNodeObject;
		}[],
		edges?: {
			id: string;
			relationship: string;
			metadata?: IJsonLdNodeObject;
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

			if (Is.object(metadata)) {
				const validationFailures: IValidationFailure[] = [];
				await JsonLdHelper.validate(metadata, validationFailures);
				Validation.asValidationError(this.CLASS_NAME, "metadata", validationFailures);
			}

			const context: IAuditableItemGraphServiceContext = {
				now: Date.now(),
				userIdentity,
				nodeIdentity
			};

			const vertexModel = this.vertexEntityToModel(vertexEntity);
			const originalModel = ObjectHelper.clone(vertexModel);

			vertexModel.metadata = metadata;

			await this.updateAliasList(context, vertexModel, aliases);
			await this.updateResourceList(context, vertexModel, resources);
			await this.updateEdgeList(context, vertexModel, edges);

			const changes = await this.addChangeset(context, originalModel, vertexModel);

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
							property: "created",
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
	 * @param properties The properties to return, if not provided defaults to id, created, aliases and metadata.
	 * @param cursor The cursor to request the next page of entities.
	 * @param pageSize The maximum number of entities in a page.
	 * @param responseType The response type to return, defaults to application/json.
	 * @returns The entities, which can be partial if a limited keys list was provided.
	 */
	public async query<T extends "json" | "jsonld" = "json">(
		options?: {
			id?: string;
			idMode?: "id" | "alias" | "both";
		},
		orderBy?: "created" | "updated",
		orderByDirection?: SortDirection,
		properties?: (keyof IAuditableItemGraphVertex)[],
		cursor?: string,
		pageSize?: number,
		responseType?: T
	): Promise<
		JsonReturnType<
			T,
			{
				/**
				 * The entities, which can be partial if a limited keys list was provided.
				 */
				entities: Partial<IAuditableItemGraphVertex>[];
				/**
				 * An optional cursor, when defined can be used to call find to get more entities.
				 */
				cursor?: string;
			},
			IJsonLdDocument
		>
	> {
		try {
			const propertiesToReturn = properties ?? ["id", "created", "updated", "aliases", "metadata"];
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

			const models: IAuditableItemGraphVertex[] | IJsonLdDocument[] = results.entities.map(e =>
				this.vertexEntityToModel(e as AuditableItemGraphVertex)
			);

			if (responseType === "jsonld") {
				const jsonLdEntities = models.map(m => this.modelToJsonLd(m));

				const jsonDocument: IJsonLdNodeObject = {
					"@context": AuditableItemGraphTypes.ContextUri,
					"@graph": jsonLdEntities,
					cursor: results.cursor
				};

				const compacted = await JsonLdProcessor.compact(jsonDocument, {
					"@context": AuditableItemGraphTypes.ContextUri
				});
				return compacted as JsonReturnType<
					T,
					{
						entities: Partial<IAuditableItemGraphVertex>[];
						cursor?: string;
					},
					IJsonLdDocument
				>;
			}

			return {
				entities: models,
				cursor: results.cursor
			} as JsonReturnType<
				T,
				{
					entities: Partial<IAuditableItemGraphVertex>[];
					cursor?: string;
				},
				IJsonLdDocument
			>;
		} catch (error) {
			throw new GeneralError(this.CLASS_NAME, "queryingFailed", undefined, error);
		}
	}

	/**
	 * Map the vertex model to an entity.
	 * @param vertexModel The vertex model.
	 * @returns The entity.
	 * @internal
	 */
	private vertexModelToEntity(vertexModel: IAuditableItemGraphVertex): AuditableItemGraphVertex {
		const entity: AuditableItemGraphVertex = {
			id: vertexModel.id,
			created: vertexModel.created,
			updated: vertexModel.updated,
			nodeIdentity: vertexModel.nodeIdentity,
			metadata: vertexModel.metadata
		};

		if (Is.arrayValue(vertexModel.aliases)) {
			const aliasIndex = [];
			entity.aliases ??= [];
			for (const aliasModel of vertexModel.aliases) {
				const aliasEntity: AuditableItemGraphAlias = {
					id: aliasModel.id,
					created: aliasModel.created,
					updated: aliasModel.updated,
					deleted: aliasModel.deleted,
					format: aliasModel.format,
					metadata: aliasModel.metadata
				};
				entity.aliases.push(aliasEntity);
				aliasIndex.push(aliasModel.id);
			}
			entity.aliasIndex = aliasIndex.join("||").toLowerCase();
		}

		if (Is.arrayValue(vertexModel.resources)) {
			entity.resources ??= [];
			for (const resourceModel of vertexModel.resources) {
				const resourceEntity: AuditableItemGraphResource = {
					id: resourceModel.id,
					created: resourceModel.created,
					updated: resourceModel.updated,
					deleted: resourceModel.deleted,
					metadata: resourceModel.metadata
				};
				entity.resources.push(resourceEntity);
			}
		}

		if (Is.arrayValue(vertexModel.edges)) {
			entity.edges ??= [];
			for (const edgeModel of vertexModel.edges) {
				const edgeEntity: AuditableItemGraphEdge = {
					id: edgeModel.id,
					created: edgeModel.created,
					updated: edgeModel.updated,
					deleted: edgeModel.deleted,
					relationship: edgeModel.relationship,
					metadata: edgeModel.metadata
				};
				entity.edges.push(edgeEntity);
			}
		}

		return entity;
	}

	/**
	 * Map the vertex entity to a model.
	 * @param vertexEntity The vertex entity.
	 * @returns The model.
	 * @internal
	 */
	private vertexEntityToModel(vertexEntity: AuditableItemGraphVertex): IAuditableItemGraphVertex {
		const model: IAuditableItemGraphVertex = {
			id: vertexEntity.id,
			created: vertexEntity.created,
			updated: vertexEntity.updated,
			nodeIdentity: vertexEntity.nodeIdentity,
			metadata: vertexEntity.metadata
		};

		if (Is.arrayValue(vertexEntity.aliases)) {
			model.aliases ??= [];
			for (const aliasEntity of vertexEntity.aliases) {
				const aliasModel: IAuditableItemGraphAlias = {
					id: aliasEntity.id,
					format: aliasEntity.format,
					created: aliasEntity.created,
					updated: aliasEntity.updated,
					deleted: aliasEntity.deleted,
					metadata: aliasEntity.metadata
				};
				model.aliases.push(aliasModel);
			}
		}

		if (Is.arrayValue(vertexEntity.resources)) {
			model.resources ??= [];
			for (const resourceEntity of vertexEntity.resources) {
				const resourceModel: IAuditableItemGraphResource = {
					id: resourceEntity.id,
					created: resourceEntity.created,
					updated: resourceEntity.updated,
					deleted: resourceEntity.deleted,
					metadata: resourceEntity.metadata
				};
				model.resources.push(resourceModel);
			}
		}

		if (Is.arrayValue(vertexEntity.edges)) {
			model.edges ??= [];
			for (const edgeEntity of vertexEntity.edges) {
				const edgeModel: IAuditableItemGraphEdge = {
					id: edgeEntity.id,
					created: edgeEntity.created,
					updated: edgeEntity.updated,
					deleted: edgeEntity.deleted,
					relationship: edgeEntity.relationship,
					metadata: edgeEntity.metadata
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
			hash: changesetEntity.hash,
			signature: changesetEntity.signature,
			immutableStorageId: changesetEntity.immutableStorageId,
			created: changesetEntity.created,
			userIdentity: changesetEntity.userIdentity,
			patches: changesetEntity.patches.map(p => ({
				op: p.op,
				path: p.path,
				from: p.from,
				value: p.value
			}))
		};

		return model;
	}

	/**
	 * Update the aliases of a vertex model.
	 * @param context The context for the operation.
	 * @param vertexModel The vertex model.
	 * @param aliases The aliases to update.
	 * @internal
	 */
	private async updateAliasList(
		context: IAuditableItemGraphServiceContext,
		vertexModel: IAuditableItemGraphVertex,
		aliases?: {
			id: string;
			format?: string;
			metadata?: IJsonLdNodeObject;
		}[]
	): Promise<void> {
		const active = vertexModel.aliases?.filter(a => Is.empty(a.deleted)) ?? [];

		// The active aliases that are not in the update list should be marked as deleted.
		if (Is.arrayValue(active)) {
			for (const alias of active) {
				if (!aliases?.find(a => a.id === alias.id)) {
					alias.deleted = context.now;
				}
			}
		}

		if (Is.arrayValue(aliases)) {
			for (const alias of aliases) {
				await this.updateAlias(context, vertexModel, alias);
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
	private async updateAlias(
		context: IAuditableItemGraphServiceContext,
		vertexModel: IAuditableItemGraphVertex,
		alias: {
			id: string;
			format?: string;
			metadata?: IJsonLdNodeObject;
		}
	): Promise<void> {
		Guards.object(this.CLASS_NAME, nameof(alias), alias);
		Guards.stringValue(this.CLASS_NAME, nameof(alias.id), alias.id);

		if (Is.object(alias.metadata)) {
			const validationFailures: IValidationFailure[] = [];
			await JsonLdHelper.validate(alias.metadata, validationFailures);
			Validation.asValidationError(this.CLASS_NAME, "alias.metadata", validationFailures);
		}

		// Try to find an existing alias with the same id.
		const existing = vertexModel.aliases?.find(a => a.id === alias.id);

		if (Is.empty(existing) || existing?.deleted) {
			// Did not find a matching item, or found one which is deleted.
			vertexModel.aliases ??= [];

			const model: IAuditableItemGraphAlias = {
				id: alias.id,
				format: alias.format,
				created: context.now,
				metadata: alias.metadata
			};

			vertexModel.aliases.push(model);
		} else if (
			existing.format !== alias.format ||
			!ObjectHelper.equal(existing.metadata, alias.metadata, false)
		) {
			// Existing alias found, update the metadata.
			existing.updated = context.now;
			existing.format = alias.format;
			existing.metadata = alias.metadata;
		}
	}

	/**
	 * Update the resources of a vertex model.
	 * @param context The context for the operation.
	 * @param vertexModel The vertex model.
	 * @param resources The resources to update.
	 * @internal
	 */
	private async updateResourceList(
		context: IAuditableItemGraphServiceContext,
		vertexModel: IAuditableItemGraphVertex,
		resources?: {
			id: string;
			metadata?: IJsonLdNodeObject;
		}[]
	): Promise<void> {
		const active = vertexModel.resources?.filter(r => Is.empty(r.deleted)) ?? [];

		// The active resources that are not in the update list should be marked as deleted.
		if (Is.arrayValue(active)) {
			for (const resource of active) {
				if (!resources?.find(a => a.id === resource.id)) {
					resource.deleted = context.now;
				}
			}
		}

		if (Is.arrayValue(resources)) {
			for (const resource of resources) {
				await this.updateResource(context, vertexModel, resource);
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
	private async updateResource(
		context: IAuditableItemGraphServiceContext,
		vertexModel: IAuditableItemGraphVertex,
		resource: {
			id: string;
			metadata?: IJsonLdNodeObject;
		}
	): Promise<void> {
		Guards.object(this.CLASS_NAME, nameof(resource), resource);
		Guards.stringValue(this.CLASS_NAME, nameof(resource.id), resource.id);

		if (Is.object(resource.metadata)) {
			const validationFailures: IValidationFailure[] = [];
			await JsonLdHelper.validate(resource.metadata, validationFailures);
			Validation.asValidationError(this.CLASS_NAME, "resource.metadata", validationFailures);
		}

		// Try to find an existing resource with the same id.
		const existing = vertexModel.resources?.find(r => r.id === resource.id);

		if (Is.empty(existing) || existing?.deleted) {
			// Did not find a matching item, or found one which is deleted.
			vertexModel.resources ??= [];

			const model: IAuditableItemGraphResource = {
				id: resource.id,
				created: context.now,
				metadata: resource.metadata
			};

			vertexModel.resources.push(model);
		} else if (!ObjectHelper.equal(existing.metadata, resource.metadata, false)) {
			// Existing resource found, update the metadata.
			existing.updated = context.now;
			existing.metadata = resource.metadata;
		}
	}

	/**
	 * Update the edges of a vertex model.
	 * @param context The context for the operation.
	 * @param vertexModel The vertex model.
	 * @param edges The edges to update.
	 * @internal
	 */
	private async updateEdgeList(
		context: IAuditableItemGraphServiceContext,
		vertexModel: IAuditableItemGraphVertex,
		edges?: {
			id: string;
			relationship: string;
			metadata?: IJsonLdNodeObject;
		}[]
	): Promise<void> {
		const active = vertexModel.edges?.filter(e => Is.empty(e.deleted)) ?? [];

		// The active edges that are not in the update list should be marked as deleted.
		if (Is.arrayValue(active)) {
			for (const edge of active) {
				if (!edges?.find(a => a.id === edge.id)) {
					edge.deleted = context.now;
				}
			}
		}

		if (Is.arrayValue(edges)) {
			for (const edge of edges) {
				await this.updateEdge(context, vertexModel, edge);
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
	private async updateEdge(
		context: IAuditableItemGraphServiceContext,
		vertexModel: IAuditableItemGraphVertex,
		edge: {
			id: string;
			relationship: string;
			metadata?: IJsonLdNodeObject;
		}
	): Promise<void> {
		Guards.object(this.CLASS_NAME, nameof(edge), edge);
		Guards.stringValue(this.CLASS_NAME, nameof(edge.id), edge.id);
		Guards.stringValue(this.CLASS_NAME, nameof(edge.relationship), edge.relationship);

		if (Is.object(edge.metadata)) {
			const validationFailures: IValidationFailure[] = [];
			await JsonLdHelper.validate(edge.metadata, validationFailures);
			Validation.asValidationError(this.CLASS_NAME, "edge.metadata", validationFailures);
		}

		// Try to find an existing edge with the same id.
		const existing = vertexModel.edges?.find(r => r.id === edge.id);

		if (Is.empty(existing) || existing?.deleted) {
			// Did not find a matching item, or found one which is deleted.
			vertexModel.edges ??= [];

			const model: IAuditableItemGraphEdge = {
				id: edge.id,
				created: context.now,
				metadata: edge.metadata,
				relationship: edge.relationship
			};

			vertexModel.edges.push(model);
		} else if (
			existing.relationship !== edge.relationship ||
			!ObjectHelper.equal(existing.metadata, edge.metadata, false)
		) {
			// Existing resource found, update the metadata.
			existing.updated = context.now;
			existing.relationship = edge.relationship;
			existing.metadata = edge.metadata;
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
		originalModel: IAuditableItemGraphVertex,
		updatedModel: IAuditableItemGraphVertex
	): Promise<boolean> {
		const patches = JsonHelper.diff(originalModel, updatedModel);

		const lastChangesetResult = await this._changesetStorage.query(
			{
				property: "vertexId",
				value: originalModel.id,
				comparison: ComparisonOperator.Equals
			},
			[
				{
					property: "created",
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
				created: context.now,
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
				new Urn(AuditableItemGraphService.NAMESPACE, originalModel.id).toString(),
				AuditableItemGraphTypes.Credential,
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
				vertexId: updatedModel.id,
				created: context.now,
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
		verifySignatureDepth: VerifyDepth
	): Promise<{
		verified?: boolean;
		changesetsVerification?: IAuditableItemGraphVerification[];
		changesets?: IAuditableItemGraphChangeset[];
	}> {
		let verified: boolean = true;
		const changesetsVerification: IAuditableItemGraphVerification[] = [];
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
						property: "created",
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
					changesets.push(this.changesetEntityToModel(storedChangeset));

					const verify: IAuditableItemGraphVerification = {
						state: AuditableItemGraphVerificationState.Ok,
						epoch: storedChangeset.created
					};

					changesetsVerification.push(verify);

					const calculatedHash = this.calculateChangesetHash(
						storedChangeset.created,
						storedChangeset.userIdentity,
						storedChangeset.patches,
						lastHash
					);

					lastHash = calculatedHash;

					if (Converter.bytesToBase64(calculatedHash) !== storedChangeset.hash) {
						verify.state = AuditableItemGraphVerificationState.HashMismatch;
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
							verify.state = AuditableItemGraphVerificationState.SignatureNotVerified;
						} else if (Is.stringValue(storedChangeset.immutableStorageId)) {
							// Get the vc from the immutable data store
							const verifiableCredentialBytes = await this._immutableStorage.get(
								storedChangeset.immutableStorageId
							);
							const verifiableCredentialJwt = Converter.bytesToUtf8(verifiableCredentialBytes);
							const decodedJwt = await Jwt.decode(verifiableCredentialJwt);

							// Verify the credential
							const verificationResult =
								await this._identityConnector.checkVerifiableCredential<IAuditableItemGraphCredential>(
									verifiableCredentialJwt
								);

							if (verificationResult.revoked) {
								verify.state = AuditableItemGraphVerificationState.CredentialRevoked;
							} else {
								// Credential is not revoked so check the signature
								const credentialData = Is.array(
									verificationResult.verifiableCredential?.credentialSubject
								)
									? verificationResult.verifiableCredential?.credentialSubject[0]
									: (verificationResult.verifiableCredential?.credentialSubject ?? {
											created: 0,
											userIdentity: "",
											signature: "",
											hash: ""
										});

								immutableNodeIdentity = DocumentHelper.parse(decodedJwt.header?.kid ?? "").id;
								immutableUserIdentity = credentialData.userIdentity;

								if (credentialData.hash !== storedChangeset.hash) {
									// Does the immutable hash match the local one we calculated
									verify.state = AuditableItemGraphVerificationState.ImmutableHashMismatch;
								} else if (credentialData.signature !== storedChangeset.signature) {
									// Does the immutable signature match the local one we calculated
									verify.state = AuditableItemGraphVerificationState.ImmutableSignatureMismatch;
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
										verify.state = AuditableItemGraphVerificationState.IntegrityDataMismatch;
									}
									const immutableIntegrity: { patches: IAuditableItemGraphPatchOperation[] } =
										JSON.parse(canonical);
									immutablePatches = immutableIntegrity.patches;
								}
							}
						}

						// If there was a failure add some additional information
						if (verify.state !== AuditableItemGraphVerificationState.Ok) {
							verify.hash = storedChangeset.hash;
							verify.integrityPatches = immutablePatches;
							verify.integrityNodeIdentity = immutableNodeIdentity;
							verify.integrityUserIdentity = immutableUserIdentity;
							verified = false;
						}
					}
				}
			}
		} while (Is.stringValue(changesetsResult.cursor));

		return {
			verified,
			changesetsVerification,
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
		now: number,
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
		b2b.update(Converter.utf8ToBytes(now.toString()));
		b2b.update(Converter.utf8ToBytes(userIdentity));

		// Add the patch operations to the hash.
		b2b.update(ObjectHelper.toBytes(patches));

		return b2b.digest();
	}

	/**
	 * Convert a model to a JSON-LD document.
	 * @param model The model to convert.
	 * @returns The JSON-LD document.
	 * @internal
	 */
	private modelToJsonLd(model: IAuditableItemGraphVertex): IJsonLdNodeObject {
		const nodeObject: IJsonLdNodeObject = {
			"@context": AuditableItemGraphTypes.ContextJsonld,
			"@type": AuditableItemGraphTypes.Vertex,
			id: model.id,
			nodeIdentity: model.nodeIdentity,
			created: new Date(model.created).toISOString()
		};

		if (Is.integer(model.updated)) {
			nodeObject.updated = new Date(model.updated).toISOString();
		}
		if (Is.objectValue(model.metadata)) {
			nodeObject.metadata = model.metadata;
		}

		if (Is.arrayValue(model.aliases)) {
			const aliasesJsonld: IJsonLdNodeObject[] = [];
			for (const alias of model.aliases) {
				const aliasJsonLd: IJsonLdNodeObject = {
					"@type": AuditableItemGraphTypes.Alias,
					id: alias.id,
					created: new Date(alias.created).toISOString()
				};
				if (Is.stringValue(alias.format)) {
					aliasJsonLd.format = alias.format;
				}
				if (Is.integer(alias.updated)) {
					aliasJsonLd.updated = new Date(alias.updated).toISOString();
				}
				if (Is.integer(alias.deleted)) {
					aliasJsonLd.deleted = new Date(alias.deleted).toISOString();
				}
				if (Is.objectValue(alias.metadata)) {
					aliasJsonLd.metadata = alias.metadata;
				}
				aliasesJsonld.push(aliasJsonLd);
			}
			nodeObject.aliases = aliasesJsonld;
		}

		if (Is.arrayValue(model.resources)) {
			const resourcesJsonld: IJsonLdNodeObject[] = [];
			for (const resource of model.resources) {
				const resourceJsonLd: IJsonLdNodeObject = {
					"@type": AuditableItemGraphTypes.Resource,
					id: resource.id,
					created: new Date(resource.created).toISOString()
				};
				if (Is.integer(resource.updated)) {
					resourceJsonLd.updated = new Date(resource.updated).toISOString();
				}
				if (Is.integer(resource.deleted)) {
					resourceJsonLd.deleted = new Date(resource.deleted).toISOString();
				}
				if (Is.objectValue(resource.metadata)) {
					resourceJsonLd.metadata = resource.metadata;
				}
				resourcesJsonld.push(resourceJsonLd);
			}
			nodeObject.resources = resourcesJsonld;
		}

		if (Is.arrayValue(model.edges)) {
			const edgesJsonld: IJsonLdNodeObject[] = [];
			for (const edge of model.edges) {
				const resourceJsonLd: IJsonLdNodeObject = {
					"@type": AuditableItemGraphTypes.Edge,
					id: edge.id,
					created: new Date(edge.created).toISOString(),
					relationship: edge.relationship
				};
				if (Is.integer(edge.updated)) {
					resourceJsonLd.updated = new Date(edge.updated).toISOString();
				}
				if (Is.integer(edge.deleted)) {
					resourceJsonLd.deleted = new Date(edge.deleted).toISOString();
				}
				if (Is.objectValue(edge.metadata)) {
					resourceJsonLd.metadata = edge.metadata;
				}
				edgesJsonld.push(resourceJsonLd);
			}
			nodeObject.edges = edgesJsonld;
		}

		if (Is.arrayValue(model.changesets)) {
			const changesetsJsonld: IJsonLdNodeObject[] = [];
			for (const changeset of model.changesets) {
				const changesetJsonLd: IJsonLdNodeObject = {
					"@type": AuditableItemGraphTypes.Changeset,
					hash: changeset.hash,
					signature: changeset.signature,
					created: new Date(changeset.created).toISOString(),
					immutableStorageId: changeset.immutableStorageId,
					userIdentity: changeset.userIdentity
				};
				if (Is.arrayValue(changeset.patches)) {
					const patchesJsonLd: IJsonLdNodeObject[] = [];
					for (const patch of changeset.patches) {
						patchesJsonLd.push({
							"@type": AuditableItemGraphTypes.PatchOperation,
							patchOperation: patch.op,
							patchPath: patch.path,
							patchFrom: patch.from,
							patchValue: patch.value as IJsonLdJsonObject
						});
					}
					changesetJsonLd.patches = patchesJsonLd;
				}
				changesetsJsonld.push(changesetJsonLd);
			}
			nodeObject.changesets = changesetsJsonld;
		}

		return nodeObject;
	}

	/**
	 * Convert a model for verification to a JSON-LD document.
	 * @param model The model to convert.
	 * @returns The JSON-LD document.
	 * @internal
	 */
	private modelVerificationToJsonLd(model: IAuditableItemGraphVerification): IJsonLdNodeObject {
		const nodeObject: IJsonLdNodeObject = {
			"@context": AuditableItemGraphTypes.ContextJsonld,
			"@type": AuditableItemGraphTypes.Verification,
			...model
		};

		return nodeObject;
	}
}
