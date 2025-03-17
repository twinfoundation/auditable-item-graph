// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { IComparator, SortDirection } from "@twin.org/entity";
import type { IAuditableItemGraphVertex } from "./IAuditableItemGraphVertex";
import type { IAuditableItemGraphVertexList } from "./IAuditableItemGraphVertexList";
import type { VerifyDepth } from "./verifyDepth";

/**
 * Interface describing an auditable item graph contract.
 */
export interface IAuditableItemGraphComponent extends IComponent {
	/**
	 * Create a new graph vertex.
	 * @param vertex The vertex to create.
	 * @param vertex.annotationObject The annotation object for the vertex as JSON-LD.
	 * @param vertex.aliases Alternative aliases that can be used to identify the vertex.
	 * @param vertex.resources The resources attached to the vertex.
	 * @param vertex.edges The edges connected to the vertex.
	 * @param userIdentity The identity to create the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The id of the new graph item.
	 */
	create(
		vertex: {
			annotationObject?: IJsonLdNodeObject;
			aliases?: {
				id: string;
				aliasFormat?: string;
				annotationObject?: IJsonLdNodeObject;
			}[];
			resources?: {
				id?: string;
				resourceObject?: IJsonLdNodeObject;
			}[];
			edges?: {
				id: string;
				edgeRelationship: string;
				annotationObject?: IJsonLdNodeObject;
			}[];
		},
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<string>;

	/**
	 * Update a graph vertex.
	 * @param vertex The vertex to update.
	 * @param vertex.id The id of the vertex to update.
	 * @param vertex.annotationObject The annotation object for the vertex as JSON-LD.
	 * @param vertex.aliases Alternative aliases that can be used to identify the vertex.
	 * @param vertex.resources The resources attached to the vertex.
	 * @param vertex.edges The edges connected to the vertex.
	 * @param userIdentity The identity to create the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	update(
		vertex: {
			id: string;
			annotationObject?: IJsonLdNodeObject;
			aliases?: {
				id: string;
				aliasFormat?: string;
				annotationObject?: IJsonLdNodeObject;
			}[];
			resources?: {
				id?: string;
				resourceObject?: IJsonLdNodeObject;
			}[];
			edges?: {
				id: string;
				edgeRelationship: string;
				annotationObject?: IJsonLdNodeObject;
			}[];
		},
		userIdentity?: string,
		nodeIdentity?: string
	): Promise<void>;

	/**
	 * Get a graph vertex.
	 * @param id The id of the vertex to get.
	 * @param options Additional options for the get operation.
	 * @param options.includeDeleted Whether to include deleted aliases, resource, edges, defaults to false.
	 * @param options.includeChangesets Whether to include the changesets of the vertex, defaults to false.
	 * @param options.verifySignatureDepth How many signatures to verify, defaults to "none".
	 * @returns The vertex if found.
	 * @throws NotFoundError if the vertex is not found.
	 */
	get(
		id: string,
		options?: {
			includeDeleted?: boolean;
			includeChangesets?: boolean;
			verifySignatureDepth?: VerifyDepth;
		}
	): Promise<IAuditableItemGraphVertex>;

	/**
	 * Remove the verifiable storage for an item.
	 * @param id The id of the vertex to remove the storage from.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 * @throws NotFoundError if the vertex is not found.
	 */
	removeVerifiable(id: string, nodeIdentity?: string): Promise<void>;

	/**
	 * Query the graph for vertices.
	 * @param options The query options.
	 * @param options.id The optional id to look for.
	 * @param options.idMode Look in id, alias or both, defaults to both.
	 * @param conditions Conditions to use in the query.
	 * @param orderBy The order for the results, defaults to dateCreated.
	 * @param orderByDirection The direction for the order, defaults to descending.
	 * @param properties The properties to return, if not provided defaults to id, dateCreated, aliases and object.
	 * @param cursor The cursor to request the next page of entities.
	 * @param pageSize The maximum number of entities in a page.
	 * @returns The entities, which can be partial if a limited keys list was provided.
	 */
	query(
		options?: {
			id?: string;
			idMode?: "id" | "alias" | "both";
		},
		conditions?: IComparator[],
		orderBy?: keyof Pick<IAuditableItemGraphVertex, "dateCreated" | "dateModified">,
		orderByDirection?: SortDirection,
		properties?: (keyof IAuditableItemGraphVertex)[],
		cursor?: string,
		pageSize?: number
	): Promise<IAuditableItemGraphVertexList>;
}
