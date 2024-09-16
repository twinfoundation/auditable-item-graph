// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import path from "node:path";
import type {
	IAuditableItemGraphCredential,
	IAuditableItemGraphPatchOperation
} from "@gtsc/auditable-item-graph-models";
import { Converter, Is, RandomHelper } from "@gtsc/core";
import { Bip39 } from "@gtsc/crypto";
import { MemoryEntityStorageConnector } from "@gtsc/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@gtsc/entity-storage-models";
import {
	EntityStorageIdentityConnector,
	type IdentityDocument,
	initSchema as initSchemaIdentity
} from "@gtsc/identity-connector-entity-storage";
import { IdentityConnectorFactory } from "@gtsc/identity-models";
import { nameof } from "@gtsc/nameof";
import type { IDidVerifiableCredential } from "@gtsc/standards-w3c-did";
import {
	EntityStorageVaultConnector,
	type VaultKey,
	type VaultSecret,
	initSchema as initSchemaVault
} from "@gtsc/vault-connector-entity-storage";
import { VaultConnectorFactory, VaultEncryptionType, VaultKeyType } from "@gtsc/vault-models";
import { type IJwtHeader, type IJwtPayload, Jwt } from "@gtsc/web";
import * as dotenv from "dotenv";

console.debug("Setting up test environment from .env and .env.dev files");

dotenv.config({ path: [path.join(__dirname, ".env"), path.join(__dirname, ".env.dev")] });

initSchemaVault();
initSchemaIdentity();

const keyEntityStorage = new MemoryEntityStorageConnector<VaultKey>({
	entitySchema: nameof<VaultKey>()
});
EntityStorageConnectorFactory.register("vault-key", () => keyEntityStorage);
const secretEntityStorage = new MemoryEntityStorageConnector<VaultSecret>({
	entitySchema: nameof<VaultSecret>()
});
EntityStorageConnectorFactory.register("vault-secret", () => secretEntityStorage);

export const TEST_VAULT_CONNECTOR = new EntityStorageVaultConnector();
VaultConnectorFactory.register("vault", () => TEST_VAULT_CONNECTOR);

const identityEntityStorage = new MemoryEntityStorageConnector<IdentityDocument>({
	entitySchema: nameof<IdentityDocument>()
});
EntityStorageConnectorFactory.register("identity-document", () => identityEntityStorage);

export const TEST_IDENTITY_CONNECTOR = new EntityStorageIdentityConnector();
IdentityConnectorFactory.register("identity", () => TEST_IDENTITY_CONNECTOR);

export let TEST_NODE_IDENTITY: string;
export let TEST_USER_IDENTITY: string;
export let TEST_VAULT_KEY: string;

/**
 * Setup the test environment.
 */
export async function setupTestEnv(): Promise<void> {
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

	const didNode = await TEST_IDENTITY_CONNECTOR.createDocument("test-node-identity");
	await TEST_IDENTITY_CONNECTOR.addVerificationMethod(
		"test-node-identity",
		didNode.id,
		"assertionMethod",
		"auditable-item-graph"
	);
	const didUser = await TEST_IDENTITY_CONNECTOR.createDocument("test-node-identity");

	TEST_NODE_IDENTITY = didNode.id;
	TEST_USER_IDENTITY = didUser.id;
	TEST_VAULT_KEY = `${TEST_NODE_IDENTITY}/auditable-item-graph`;

	await TEST_VAULT_CONNECTOR.addKey(
		TEST_VAULT_KEY,
		VaultKeyType.Ed25519,
		Converter.base64ToBytes("p519gRazpBYvzqviRrFRBUT+ZNRZ24FYgOLcGO+Nj4Q="),
		Converter.base64ToBytes("DzFGb9pwkyom+MGrKeVCAV2CMEiy04z9bJLj48XGjWw=")
	);
}

/**
 * Decode the JWT to get the integrity data.
 * @param immutableStore The immutable store to decode.
 * @returns The integrity data.
 */
export async function decodeJwtToIntegrity(immutableStore: string): Promise<{
	created: number;
	userIdentity: string;
	hash: string;
	signature: string;
	integrity: {
		patches: IAuditableItemGraphPatchOperation[];
	};
}> {
	const vcJwt = Converter.bytesToUtf8(Converter.base64ToBytes(immutableStore));
	const decodedJwt = await Jwt.decode<
		IJwtHeader,
		IJwtPayload & { vc: IDidVerifiableCredential<IAuditableItemGraphCredential> }
	>(vcJwt);
	const credentialData = Is.arrayValue(decodedJwt.payload?.vc?.credentialSubject)
		? decodedJwt.payload?.vc?.credentialSubject[0]
		: decodedJwt.payload?.vc?.credentialSubject ?? {
				created: 0,
				userIdentity: "",
				hash: "",
				signature: ""
			};

	const integrityBytes = await TEST_VAULT_CONNECTOR.decrypt(
		TEST_VAULT_KEY,
		VaultEncryptionType.ChaCha20Poly1305,
		Converter.base64ToBytes(credentialData.integrity ?? "")
	);

	return {
		created: credentialData.created,
		userIdentity: credentialData.userIdentity,
		hash: credentialData.hash,
		signature: credentialData.signature,
		integrity: JSON.parse(Converter.bytesToUtf8(integrityBytes))
	};
}
