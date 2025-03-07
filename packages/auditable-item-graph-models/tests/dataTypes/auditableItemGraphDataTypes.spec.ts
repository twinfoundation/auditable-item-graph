// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IValidationFailure } from "@twin.org/core";
import { DataTypeHelper } from "@twin.org/data-core";
import { JsonLdDataTypes } from "@twin.org/data-json-ld";
import { AuditableItemGraphDataTypes } from "../../src/dataTypes/auditableItemGraphDataTypes";
import { AuditableItemGraphContexts } from "../../src/models/auditableItemGraphContexts";
import { AuditableItemGraphTypes } from "../../src/models/auditableItemGraphTypes";

describe("AuditableItemGraphDataTypes", () => {
	beforeAll(async () => {
		JsonLdDataTypes.registerTypes();
		AuditableItemGraphDataTypes.registerTypes();
	});

	test("Can fail to validate an empty vertex", async () => {
		const validationFailures: IValidationFailure[] = [];
		const isValid = await DataTypeHelper.validate(
			"",
			AuditableItemGraphTypes.Vertex,
			{},
			validationFailures
		);
		expect(validationFailures.length).toEqual(1);
		expect(isValid).toEqual(false);
	});

	test("Can validate an empty vertex", async () => {
		const validationFailures: IValidationFailure[] = [];
		const isValid = await DataTypeHelper.validate(
			"",
			AuditableItemGraphTypes.Vertex,
			{
				"@context": [
					AuditableItemGraphContexts.ContextRoot,
					AuditableItemGraphContexts.ContextRootCommon
				],
				type: AuditableItemGraphTypes.Vertex,
				dateCreated: new Date().toISOString(),
				id: "1111"
			},
			validationFailures
		);
		expect(validationFailures.length).toEqual(0);
		expect(isValid).toEqual(true);
	});
});
