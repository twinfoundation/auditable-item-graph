// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@gtsc/entity";
import { nameof } from "@gtsc/nameof";
import { AuditableItemGraphAlias } from "./entities/auditableItemGraphAlias";
import { AuditableItemGraphChangeset } from "./entities/auditableItemGraphChangeset";
import { AuditableItemGraphEdge } from "./entities/auditableItemGraphEdge";
import { AuditableItemGraphProperty } from "./entities/auditableItemGraphProperty";
import { AuditableItemGraphResource } from "./entities/auditableItemGraphResource";
import { AuditableItemGraphVertex } from "./entities/auditableItemGraphVertex";

/**
 * Initialize the schema for the auditable item graph entity storage connector.
 */
export function initSchema(): void {
	EntitySchemaFactory.register(nameof<AuditableItemGraphVertex>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphVertex)
	);
	EntitySchemaFactory.register(nameof<AuditableItemGraphAlias>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphAlias)
	);
	EntitySchemaFactory.register(nameof<AuditableItemGraphResource>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphResource)
	);
	EntitySchemaFactory.register(nameof<AuditableItemGraphEdge>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphEdge)
	);
	EntitySchemaFactory.register(nameof<AuditableItemGraphProperty>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphProperty)
	);
	EntitySchemaFactory.register(nameof<AuditableItemGraphChangeset>(), () =>
		EntitySchemaHelper.getSchema(AuditableItemGraphChangeset)
	);
}
