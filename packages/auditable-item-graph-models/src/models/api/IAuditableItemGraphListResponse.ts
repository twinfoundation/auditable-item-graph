// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdDocument } from "@twin.org/data-json-ld";
import type { HeaderTypes, MimeTypes } from "@twin.org/web";
import type { IAuditableItemGraphVertex } from "../IAuditableItemGraphVertex";

/**
 * The response to getting the a list of the vertices with matching ids or aliases.
 */
export interface IAuditableItemGraphListResponse {
	/**
	 * The headers which can be used to determine the response data type.
	 */
	headers?: {
		[HeaderTypes.ContentType]: typeof MimeTypes.Json | typeof MimeTypes.JsonLd;
	};

	/**
	 * The response payload.
	 */
	body:
		| IJsonLdDocument
		| {
				/**
				 * The entities, which can be partial if a limited keys list was provided.
				 */
				entities?: Partial<IAuditableItemGraphVertex>[];

				/**
				 * An optional cursor, when defined can be used to call find to get more entities.
				 */
				cursor?: string;
		  };
}
