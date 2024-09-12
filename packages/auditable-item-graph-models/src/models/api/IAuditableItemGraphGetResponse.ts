// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdDocument } from "@gtsc/data-json-ld";
import type { HeaderTypes, MimeTypes } from "@gtsc/web";
import type { IAuditableItemGraphVertex } from "../IAuditableItemGraphVertex";

/**
 * Response to getting an auditable item graph vertex.
 */
export interface IAuditableItemGraphGetResponse {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		// False positive
		// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
		[HeaderTypes.ContentType]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The response body, if accept header is set to application/ld+json the return object is JSON-LD document.
	 */
	body: (IAuditableItemGraphVertex | IJsonLdDocument) & {
		/**
		 * Whether the vertex has been verified.
		 */
		verified?: boolean;

		/**
		 * The verification for the changesets including any failure information.
		 */
		verification?: {
			created: number;
			failure?: string;
			failureProperties?: { [id: string]: unknown };
		}[];
	};
}
