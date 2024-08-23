// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import path from "node:path";
import { Converter } from "@gtsc/core";
import { MemoryEntityStorageConnector } from "@gtsc/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@gtsc/entity-storage-models";
import { nameof } from "@gtsc/nameof";
import {
	EntityStorageVaultConnector,
	type VaultKey,
	type VaultSecret,
	initSchema as initSchemaVault
} from "@gtsc/vault-connector-entity-storage";
import { VaultConnectorFactory, VaultKeyType } from "@gtsc/vault-models";
import * as dotenv from "dotenv";

console.debug("Setting up test environment from .env and .env.dev files");

dotenv.config({ path: [path.join(__dirname, ".env"), path.join(__dirname, ".env.dev")] });

export const TEST_NODE_ID = "test-node-identity";
export const TEST_IDENTITY_ID = "test-identity";

initSchemaVault();

const keyEntityStorage = new MemoryEntityStorageConnector<VaultKey>({
	entitySchema: nameof<VaultKey>()
});
EntityStorageConnectorFactory.register("vault-key", () => keyEntityStorage);
const secretEntityStorage = new MemoryEntityStorageConnector<VaultSecret>({
	entitySchema: nameof<VaultSecret>()
});
EntityStorageConnectorFactory.register("vault-secret", () => secretEntityStorage);

const TEST_VAULT_CONNECTOR = new EntityStorageVaultConnector();
VaultConnectorFactory.register("vault", () => TEST_VAULT_CONNECTOR);

/**
 * Setup the test environment.
 */
export async function setupTestEnv(): Promise<void> {
	await TEST_VAULT_CONNECTOR.addKey(
		`${TEST_NODE_ID}/auditable-item-graph`,
		VaultKeyType.Ed25519,
		Converter.base64ToBytes("p519gRazpBYvzqviRrFRBUT+ZNRZ24FYgOLcGO+Nj4Q="),
		Converter.base64ToBytes("DzFGb9pwkyom+MGrKeVCAV2CMEiy04z9bJLj48XGjWw=")
	);
}
