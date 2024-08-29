// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@gtsc/entity";

/**
 * Class describing a set of updates to the vertex.
 */
@entity()
export class AuditableItemGraphChangeset {
	/**
	 * The timestamp of when the changeset was created.
	 */
	@property({ type: "number" })
	public created!: number;

	/**
	 * The identity of the user who made the changeset.
	 */
	@property({ type: "string" })
	public userIdentity!: string;

	/**
	 * The hash of the changeset.
	 */
	@property({ type: "string" })
	public hash!: string;

	/**
	 * The immutable storage id which contains the signature for this changeset.
	 */
	@property({ type: "string" })
	public immutableStorageId?: string;
}
