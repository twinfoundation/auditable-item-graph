// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * How deep to verify the signatures.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const VerifyDepth = {
	/**
	 * Do not verify any signatures.
	 */
	None: "none",

	/**
	 * Verify only the most recent signature.
	 */
	Current: "current",

	/**
	 * Verify all the signatures.
	 */
	All: "all"
} as const;

/**
 * How deep to verify the signatures.
 */
export type VerifyDepth = (typeof VerifyDepth)[keyof typeof VerifyDepth];
