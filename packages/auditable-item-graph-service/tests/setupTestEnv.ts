// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { Converter, RandomHelper } from "@twin.org/core";
import { Bip39 } from "@twin.org/crypto";
import { Engine } from "@twin.org/engine";
import { EngineCoreFactory } from "@twin.org/engine-models";
import {
	EntityStorageConnectorType,
	IdentityConnectorType,
	type IEngineConfig,
	VaultConnectorType
} from "@twin.org/engine-types";
import { initSchema as initSchemaIdentity } from "@twin.org/identity-connector-entity-storage";
import { IdentityConnectorFactory } from "@twin.org/identity-models";
import { initSchema as initSchemaVault } from "@twin.org/vault-connector-entity-storage";
import { VaultConnectorFactory, VaultKeyType } from "@twin.org/vault-models";
import * as dotenv from "dotenv";

console.debug("Setting up test environment from .env and .env.dev files");

dotenv.config({ path: [path.join(__dirname, ".env"), path.join(__dirname, ".env.dev")] });

const TEST_FOLDER = "./tests/.tmp";

initSchemaVault();
initSchemaIdentity();

const engineConfig: IEngineConfig = {
	silent: true,
	types: {
		entityStorageConnector: [
			{
				type: EntityStorageConnectorType.File,
				options: {
					config: {
						directory: TEST_FOLDER
					}
				}
			}
		],
		identityConnector: [
			{ type: IdentityConnectorType.EntityStorage, overrideInstanceType: "identity" }
		],
		vaultConnector: [{ type: VaultConnectorType.EntityStorage, overrideInstanceType: "vault" }]
	}
};

const engine = new Engine({
	config: engineConfig
});

EngineCoreFactory.register("engine", () => engine);

export let TEST_NODE_IDENTITY: string;
export let TEST_USER_IDENTITY: string;
export let TEST_VAULT_KEY: string;

/**
 * Setup the test environment.
 */
export async function setupTestEnv(): Promise<void> {
	await cleanupTestEnv();
	await mkdir(TEST_FOLDER, { recursive: true });

	await engine.start();

	RandomHelper.generate = vi
		.fn()
		.mockImplementationOnce(length => new Uint8Array(length).fill(99))
		.mockImplementation(length => new Uint8Array(length).fill(88));
	Bip39.randomMnemonic = vi
		.fn()
		.mockImplementation(
			() =>
				"elder blur tip exact organ pipe other same minute grace conduct father brother prosper tide icon pony suggest joy provide dignity domain nominee liquid"
		);

	const testIdentityConnector = IdentityConnectorFactory.get("identity");
	const testVaultConnector = VaultConnectorFactory.get("vault");

	const didNode = await testIdentityConnector.createDocument("test-node-identity");
	await testIdentityConnector.addVerificationMethod(
		"test-node-identity",
		didNode.id,
		"assertionMethod",
		"immutable-proof-assertion"
	);
	const didUser = await testIdentityConnector.createDocument("test-node-identity");

	TEST_NODE_IDENTITY = didNode.id;
	TEST_USER_IDENTITY = didUser.id;
	TEST_VAULT_KEY = `${TEST_NODE_IDENTITY}/immutable-proof-hash`;

	await testVaultConnector.addKey(
		TEST_VAULT_KEY,
		VaultKeyType.Ed25519,
		Converter.base64ToBytes("p519gRazpBYvzqviRrFRBUT+ZNRZ24FYgOLcGO+Nj4Q="),
		Converter.base64ToBytes("DzFGb9pwkyom+MGrKeVCAV2CMEiy04z9bJLj48XGjWw=")
	);
}

/**
 * Cleanup the test environment.
 */
export async function cleanupTestEnv(): Promise<void> {
	try {
		await rm(TEST_FOLDER, { recursive: true });
	} catch {}
}
