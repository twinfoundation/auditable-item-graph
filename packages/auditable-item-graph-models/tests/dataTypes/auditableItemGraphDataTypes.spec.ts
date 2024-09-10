// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IValidationFailure } from "@gtsc/core";
import { DataTypeHelper } from "@gtsc/data-core";
import { JsonLdDataTypes } from "@gtsc/data-json-ld";
import { SchemaOrgDataTypes } from "@gtsc/data-schema-org";
import { AuditableItemGraphDataTypes } from "../../src/dataTypes/auditableItemGraphDataTypes";
import { AuditableItemGraphTypes } from "../../src/models/auditableItemGraphTypes";

describe("AuditableItemGraphDataTypes", () => {
	beforeAll(async () => {
		JsonLdDataTypes.registerTypes();
		AuditableItemGraphDataTypes.registerTypes();
		SchemaOrgDataTypes.registerTypes();
	});

	test("Can validate an empty vertex", async () => {
		const validationFailures: IValidationFailure[] = [];
		const isValid = await DataTypeHelper.validate(
			"",
			AuditableItemGraphTypes.Vertex,
			{},
			validationFailures
		);
		expect(validationFailures.length).toEqual(0);
		expect(isValid).toEqual(true);
	});
});
