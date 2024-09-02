// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@gtsc/entity";

/**
 * Class describing the auditable item graph patches.
 */
@entity()
export class AuditableItemGraphPatch {
	/**
	 * The operation for the patch.
	 */
	@property({ type: "string" })
	public op!: "add" | "remove" | "replace" | "move" | "copy" | "test";

	/**
	 * The path for the patch.
	 */
	@property({ type: "string" })
	public path!: string;

	/**
	 * The from for the patch.
	 */
	@property({ type: "string" })
	public from?: string;

	/**
	 * The value for the patch.
	 */
	@property({ type: "object" })
	public value?: unknown;
}
