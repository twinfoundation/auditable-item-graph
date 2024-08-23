// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { AuditableItemGraphClient } from "../src/auditableItemGraphClient";

describe("AuditableItemGraphClient", () => {
	test("Can create an instance", async () => {
		const client = new AuditableItemGraphClient({ endpoint: "http://localhost:8080" });
		expect(client).toBeDefined();
	});
});
