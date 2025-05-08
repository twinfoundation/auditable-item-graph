// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	HttpParameterHelper,
	type ICreatedResponse,
	type IHttpRequestContext,
	type INoContentResponse,
	type IRestRoute,
	type ITag
} from "@twin.org/api-models";
import {
	AuditableItemGraphContexts,
	AuditableItemGraphTypes,
	type IAuditableItemGraphComponent,
	type IAuditableItemGraphCreateRequest,
	type IAuditableItemGraphGetRequest,
	type IAuditableItemGraphGetResponse,
	type IAuditableItemGraphListRequest,
	type IAuditableItemGraphListResponse,
	type IAuditableItemGraphUpdateRequest
} from "@twin.org/auditable-item-graph-models";
import { ComponentFactory, Guards } from "@twin.org/core";
import { nameof } from "@twin.org/nameof";
import { SchemaOrgContexts, SchemaOrgTypes } from "@twin.org/standards-schema-org";
import { HeaderTypes, HttpStatusCode, MimeTypes } from "@twin.org/web";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "auditableItemGraphRoutes";

/**
 * The tag to associate with the routes.
 */
export const tagsAuditableItemGraph: ITag[] = [
	{
		name: "Auditable Item Graph",
		description: "Endpoints which are modelled to access an auditable item graph contract."
	}
];

/**
 * The REST routes for auditable item graph.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesAuditableItemGraph(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const createRoute: IRestRoute<IAuditableItemGraphCreateRequest, ICreatedResponse> = {
		operationId: "auditableItemGraphCreate",
		summary: "Create a new graph vertex",
		tag: tagsAuditableItemGraph[0].name,
		method: "POST",
		path: `${baseRouteName}/`,
		handler: async (httpRequestContext, request) =>
			auditableItemGraphCreate(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemGraphCreateRequest>(),
			examples: [
				{
					id: "auditableItemGraphCreateRequestExample",
					request: {
						body: {
							annotationObject: {
								"@context": "https://schema.org",
								"@type": "Note",
								content: "This is a simple note"
							},
							aliases: [
								{
									id: "bar456",
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									id: "foo321",
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							],
							resources: [
								{
									id: "resource1",
									resourceObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									id: "resource2",
									resourceObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							],
							edges: [
								{
									id: "edge1",
									edgeRelationships: ["frenemy"],
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									id: "edge2",
									edgeRelationships: ["end"],
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							]
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ICreatedResponse>(),
				examples: [
					{
						id: "auditableItemGraphCreateResponseExample",
						description: "The response when a new graph vertex is created.",
						response: {
							statusCode: HttpStatusCode.created,
							headers: {
								[HeaderTypes.Location]: "aig:1234567890"
							}
						}
					}
				]
			}
		]
	};

	const getRoute: IRestRoute<IAuditableItemGraphGetRequest, IAuditableItemGraphGetResponse> = {
		operationId: "auditableItemGraphGet",
		summary: "Get a graph vertex",
		tag: tagsAuditableItemGraph[0].name,
		method: "GET",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			auditableItemGraphGet(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemGraphGetRequest>(),
			examples: [
				{
					id: "auditableItemGraphGetRequestExample",
					request: {
						headers: {
							[HeaderTypes.Accept]: MimeTypes.Json
						},
						pathParams: {
							id: "aig:1234567890"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemGraphGetResponse>(),
				examples: [
					{
						id: "auditableItemGraphGetResponseExample",
						response: {
							body: {
								"@context": [
									AuditableItemGraphContexts.ContextRoot,
									AuditableItemGraphContexts.ContextRootCommon,
									SchemaOrgContexts.ContextRoot
								],
								type: AuditableItemGraphTypes.Vertex,
								id: "aig:1234567890",
								dateCreated: "2024-08-22T11:55:16.271Z",
								dateModified: "2024-08-22T11:55:16.271Z",
								annotationObject: {
									"@context": "https://schema.org",
									"@type": "Note",
									content: "This is a simple note"
								},
								aliases: [
									{
										"@context": [
											AuditableItemGraphContexts.ContextRoot,
											AuditableItemGraphContexts.ContextRootCommon,
											SchemaOrgContexts.ContextRoot
										],
										type: AuditableItemGraphTypes.Alias,
										id: "tst:1234567890",
										dateCreated: "2024-08-22T11:55:16.271Z"
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<IAuditableItemGraphGetResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "auditableItemGraphJsonLdGetResponseExample",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.JsonLd
							},
							body: {
								"@context": [
									AuditableItemGraphContexts.ContextRoot,
									AuditableItemGraphContexts.ContextRootCommon,
									SchemaOrgContexts.ContextRoot
								],
								type: AuditableItemGraphTypes.Vertex,
								id: "aig:1234567890",
								dateCreated: "2024-08-22T11:55:16.271Z",
								dateModified: "2024-08-22T11:55:16.271Z",
								annotationObject: {
									"@context": "https://schema.org",
									"@type": "Note",
									content: "This is a simple note"
								},
								aliases: [
									{
										"@context": [
											AuditableItemGraphContexts.ContextRoot,
											AuditableItemGraphContexts.ContextRootCommon,
											SchemaOrgContexts.ContextRoot
										],
										type: AuditableItemGraphTypes.Alias,
										dateCreated: "2024-08-22T11:55:16.271Z",
										id: "tst:1234567890"
									}
								]
							}
						}
					}
				]
			}
		]
	};

	const updateRoute: IRestRoute<IAuditableItemGraphUpdateRequest, INoContentResponse> = {
		operationId: "auditableItemGraphUpdate",
		summary: "Update a graph vertex",
		tag: tagsAuditableItemGraph[0].name,
		method: "PUT",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			auditableItemGraphUpdate(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemGraphUpdateRequest>(),
			examples: [
				{
					id: "auditableItemGraphUpdateRequestExample",
					request: {
						pathParams: {
							id: "aig:1234567890"
						},
						body: {
							annotationObject: {
								"@context": "https://schema.org",
								"@type": "Note",
								content: "This is a simple note"
							},
							aliases: [
								{
									id: "bar456",
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									id: "foo321",
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							],
							resources: [
								{
									id: "resource1",
									resourceObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									id: "resource2",
									resourceObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							],
							edges: [
								{
									id: "edge1",
									edgeRelationships: ["frenemy"],
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									id: "edge2",
									edgeRelationships: ["end"],
									annotationObject: {
										"@context": "https://schema.org",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							]
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			}
		]
	};

	const listRoute: IRestRoute<IAuditableItemGraphListRequest, IAuditableItemGraphListResponse> = {
		operationId: "auditableItemGraphList",
		summary: "Query graph vertices by id or alias",
		tag: tagsAuditableItemGraph[0].name,
		method: "GET",
		path: `${baseRouteName}/`,
		handler: async (httpRequestContext, request) =>
			auditableItemGraphList(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditableItemGraphListRequest>(),
			examples: [
				{
					id: "IAuditableItemGraphListAllRequest",
					request: {}
				},
				{
					id: "IAuditableItemGraphListIdRequest",
					request: {
						query: {
							id: "1234567890"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditableItemGraphListResponse>(),
				examples: [
					{
						id: "auditableItemGraphListResponseExample",
						response: {
							body: {
								"@context": [
									SchemaOrgContexts.ContextRoot,
									AuditableItemGraphContexts.ContextRoot,
									AuditableItemGraphContexts.ContextRootCommon
								],
								type: SchemaOrgTypes.ItemList,
								[SchemaOrgTypes.ItemListElement]: [
									{
										"@context": [
											AuditableItemGraphContexts.ContextRoot,
											AuditableItemGraphContexts.ContextRootCommon,
											SchemaOrgContexts.ContextRoot
										],
										type: AuditableItemGraphTypes.Vertex,
										id: "0101010101010101010101010101010101010101010101010101010101010101",
										dateCreated: "2024-08-22T11:55:16.271Z",
										aliases: [
											{
												"@context": [
													AuditableItemGraphContexts.ContextRoot,
													AuditableItemGraphContexts.ContextRootCommon,
													SchemaOrgContexts.ContextRoot
												],
												type: AuditableItemGraphTypes.Alias,
												id: "foo4",
												dateCreated: "2024-08-22T11:55:16.271Z"
											}
										]
									}
								],
								[SchemaOrgTypes.NextItem]: "1"
							}
						}
					}
				]
			},
			{
				type: nameof<IAuditableItemGraphListResponse>(),
				mimeType: MimeTypes.JsonLd,
				examples: [
					{
						id: "auditableItemGraphJsonLdListResponseExample",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.JsonLd
							},
							body: {
								"@context": [
									SchemaOrgContexts.ContextRoot,
									AuditableItemGraphContexts.ContextRoot,
									AuditableItemGraphContexts.ContextRootCommon
								],
								type: SchemaOrgTypes.ItemList,
								[SchemaOrgTypes.ItemListElement]: [
									{
										"@context": [
											AuditableItemGraphContexts.ContextRoot,
											AuditableItemGraphContexts.ContextRootCommon,
											SchemaOrgContexts.ContextRoot
										],
										type: AuditableItemGraphTypes.Vertex,
										id: "0101010101010101010101010101010101010101010101010101010101010101",
										dateCreated: "2024-08-22T11:55:16.271Z",
										aliases: [
											{
												"@context": [
													AuditableItemGraphContexts.ContextRoot,
													AuditableItemGraphContexts.ContextRootCommon,
													SchemaOrgContexts.ContextRoot
												],
												type: AuditableItemGraphTypes.Alias,
												id: "foo4",
												dateCreated: "2024-08-22T11:55:16.271Z"
											}
										]
									}
								],
								[SchemaOrgTypes.NextItem]: "1"
							}
						}
					}
				]
			}
		]
	};

	return [createRoute, getRoute, updateRoute, listRoute];
}

/**
 * Create the graph vertex.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemGraphCreate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemGraphCreateRequest
): Promise<ICreatedResponse> {
	Guards.object<IAuditableItemGraphCreateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemGraphCreateRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);
	const id = await component.create(
		request.body,
		httpRequestContext.userIdentity,
		httpRequestContext.nodeIdentity
	);
	return {
		statusCode: HttpStatusCode.created,
		headers: {
			[HeaderTypes.Location]: id
		}
	};
}

/**
 * Get the graph vertex.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemGraphGet(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemGraphGetRequest
): Promise<IAuditableItemGraphGetResponse> {
	Guards.object<IAuditableItemGraphGetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemGraphGetRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);

	const mimeType = request.headers?.[HeaderTypes.Accept] === MimeTypes.JsonLd ? "jsonld" : "json";

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);
	const result = await component.get(request.pathParams.id, {
		includeDeleted: request.query?.includeDeleted,
		includeChangesets: request.query?.includeChangesets,
		verifySignatureDepth: request.query?.verifySignatureDepth
	});

	return {
		headers: {
			[HeaderTypes.ContentType]: mimeType === "json" ? MimeTypes.Json : MimeTypes.JsonLd
		},
		body: result
	};
}

/**
 * Update the graph vertex.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemGraphUpdate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemGraphUpdateRequest
): Promise<INoContentResponse> {
	Guards.object<IAuditableItemGraphUpdateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemGraphUpdateRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.object<IAuditableItemGraphUpdateRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);
	await component.update(
		{ ...request.body, id: request.pathParams.id },
		httpRequestContext.userIdentity,
		httpRequestContext.nodeIdentity
	);
	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Query the graph vertices.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function auditableItemGraphList(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditableItemGraphListRequest
): Promise<IAuditableItemGraphListResponse> {
	Guards.object<IAuditableItemGraphListRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditableItemGraphListRequest["query"]>(
		ROUTES_SOURCE,
		nameof(request.query),
		request.query
	);

	const mimeType = request.headers?.[HeaderTypes.Accept] === MimeTypes.JsonLd ? "jsonld" : "json";

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);

	const result = await component.query(
		{
			id: request.query?.id,
			idMode: request.query?.idMode,
			resourceTypes: HttpParameterHelper.arrayFromString(request.query?.resourceTypes)
		},
		HttpParameterHelper.objectFromString(request.query?.conditions),
		request.query?.orderBy,
		request.query?.orderByDirection,
		HttpParameterHelper.arrayFromString(request.query?.properties),
		request.query?.cursor,
		request.query?.pageSize
	);

	return {
		headers: {
			[HeaderTypes.ContentType]: mimeType === "json" ? MimeTypes.Json : MimeTypes.JsonLd
		},
		body: result
	};
}
