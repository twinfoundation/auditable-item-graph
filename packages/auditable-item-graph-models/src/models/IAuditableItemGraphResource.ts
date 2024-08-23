// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphAuditedElement } from "./IAuditableItemGraphAuditedElement";
import type { IAuditableItemGraphMetadataElement } from "./IAuditableItemGraphMetadataElement";

/**
 * Interface describing an auditable item graph vertex resource.
 */
export interface IAuditableItemGraphResource
	extends IAuditableItemGraphAuditedElement,
		IAuditableItemGraphMetadataElement {}
