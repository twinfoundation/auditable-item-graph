// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestRouteEntryPoint } from "@twin.org/api-models";
import {
	generateRestRoutesAuditableItemGraph,
	tagsAuditableItemGraph
} from "./auditableItemGraphRoutes";

export const restEntryPoints: IRestRouteEntryPoint[] = [
	{
		name: "auditable-item-graph",
		defaultBaseRoute: "auditable-item-graph",
		tags: tagsAuditableItemGraph,
		generateRoutes: generateRestRoutesAuditableItemGraph
	}
];
