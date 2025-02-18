// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement } from "@twin.org/data-json-ld";
import type { IImmutableProofVerification } from "@twin.org/immutable-proof-models";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes";
import type { IAuditableItemGraphPatchOperation } from "./IAuditableItemGraphPatchOperation";

/**
 * Interface describing a set of updates to the vertex.
 */
export interface IAuditableItemGraphChangeset {
	/**
	 * JSON-LD Context.
	 */
	"@context": [
		typeof AuditableItemGraphTypes.ContextRoot,
		typeof AuditableItemGraphTypes.ContextRootCommon,
		...IJsonLdContextDefinitionElement[]
	];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.Changeset;

	/**
	 * The id of the changeset.
	 */
	id: string;

	/**
	 * The date/time of when the changeset was created.
	 */
	dateCreated: string;

	/**
	 * The user identity that created the changes.
	 */
	userIdentity: string;

	/**
	 * The patches in the changeset.
	 */
	patches: IAuditableItemGraphPatchOperation[];

	/**
	 * The immutable proof id which contains the signature for this changeset.
	 */
	proofId?: string;

	/**
	 * The verification for the changeset.
	 */
	verification?: IImmutableProofVerification;
}
