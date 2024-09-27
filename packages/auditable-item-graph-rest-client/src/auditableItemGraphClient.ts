// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseRestClient } from "@twin.org/api-core";
import type {
	IBaseRestClientConfig,
	ICreatedResponse,
	INoContentResponse
} from "@twin.org/api-models";
import type {
	IAuditableItemGraphComponent,
	IAuditableItemGraphCreateRequest,
	IAuditableItemGraphGetRequest,
	IAuditableItemGraphGetResponse,
	IAuditableItemGraphListRequest,
	IAuditableItemGraphListResponse,
	IAuditableItemGraphUpdateRequest,
	IAuditableItemGraphVertex,
	IAuditableItemGraphVertexList,
	VerifyDepth
} from "@twin.org/auditable-item-graph-models";
import { Guards, NotSupportedError } from "@twin.org/core";
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { SortDirection } from "@twin.org/entity";
import { nameof } from "@twin.org/nameof";
import { HeaderTypes, MimeTypes } from "@twin.org/web";

/**
 * Client for performing auditable item graph through to REST endpoints.
 */
export class AuditableItemGraphClient
	extends BaseRestClient
	implements IAuditableItemGraphComponent
{
	/**
	 * Runtime name for the class.
	 */
	public readonly CLASS_NAME: string = nameof<AuditableItemGraphClient>();

	/**
	 * Create a new instance of AuditableItemGraphClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(nameof<AuditableItemGraphClient>(), config, "auditable-item-graph");
	}

	/**
	 * Create a new graph vertex.
	 * @param vertexObject The object for the vertex.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param resources The resources attached to the vertex.
	 * @param edges The edges connected to the vertex.
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
		}[]
	): Promise<string> {
		const response = await this.fetch<IAuditableItemGraphCreateRequest, ICreatedResponse>(
			"/",
			"POST",
			{
				body: {
					vertexObject,
					aliases,
					resources,
					edges
				}
			}
		);

		return response.headers[HeaderTypes.Location];
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

		const response = await this.fetch<
			IAuditableItemGraphGetRequest,
			IAuditableItemGraphGetResponse
		>("/:id", "GET", {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			pathParams: {
				id
			},
			query: {
				includeDeleted: options?.includeDeleted,
				includeChangesets: options?.includeChangesets,
				verifySignatureDepth: options?.verifySignatureDepth
			}
		});

		return response.body;
	}

	/**
	 * Update a graph vertex.
	 * @param id The id of the vertex to update.
	 * @param vertexObject The object for the vertex as JSON-LD.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param resources The resources attached to the vertex.
	 * @param edges The edges connected to the vertex.
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
		}[]
	): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);

		await this.fetch<IAuditableItemGraphUpdateRequest, INoContentResponse>("/:id", "PUT", {
			pathParams: {
				id
			},
			body: {
				vertexObject,
				aliases,
				resources,
				edges
			}
		});
	}

	/**
	 * Remove the immutable storage for an item.
	 * @param id The id of the vertex to get.
	 * @returns Nothing.
	 * @throws NotFoundError if the vertex is not found.
	 * @internal
	 */
	public async removeImmutable(id: string): Promise<void> {
		throw new NotSupportedError(this.CLASS_NAME, "removeImmutable");
	}

	/**
	 * Query the graph for vertices.
	 * @param options The query options.
	 * @param options.id The optional id to look for.
	 * @param options.idMode Look in id, alias or both, defaults to both.
	 * @param orderBy The order for the results, defaults to created.
	 * @param orderByDirection The direction for the order, defaults to descending.
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
		const response = await this.fetch<
			IAuditableItemGraphListRequest,
			IAuditableItemGraphListResponse
		>("/", "GET", {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			},
			query: {
				id: options?.id,
				idMode: options?.idMode,
				orderBy,
				orderByDirection,
				properties: properties?.join(","),
				cursor,
				pageSize
			}
		});

		return response.body;
	}
}
