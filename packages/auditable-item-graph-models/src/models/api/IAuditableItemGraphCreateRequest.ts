// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";

/**
 * Create an auditable item graph vertex.
 */
export interface IAuditableItemGraphCreateRequest {
	/**
	 * The data to be used in the vertex.
	 */
	body: {
		/**
		 * The object to be used in the vertex as JSON-LD.
		 */
		annotationObject?: IJsonLdNodeObject;

		/**
		 * Alternative aliases that can be used to identify the vertex.
		 */
		aliases?: {
			id: string;
			aliasFormat?: string;
			annotationObject?: IJsonLdNodeObject;
		}[];

		/**
		 * The resources attached to the vertex.
		 */
		resources?: {
			id?: string;
			resourceObject?: IJsonLdNodeObject;
		}[];

		/**
		 * The edges connected to the vertex.
		 */
		edges?: {
			id: string;
			edgeRelationship: string;
			annotationObject?: IJsonLdNodeObject;
		}[];
	};
}
