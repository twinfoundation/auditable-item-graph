// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	ICreatedResponse,
	IHttpRequestContext,
	INoContentResponse,
	IRestRoute,
	ITag
} from "@twin.org/api-models";
import type {
	IAuditableItemGraphComponent,
	IAuditableItemGraphCreateRequest,
	IAuditableItemGraphGetRequest,
	IAuditableItemGraphGetResponse,
	IAuditableItemGraphListRequest,
	IAuditableItemGraphListResponse,
	IAuditableItemGraphUpdateRequest,
	IAuditableItemGraphVertex
} from "@twin.org/auditable-item-graph-models";
import { ComponentFactory, Guards } from "@twin.org/core";
import { nameof } from "@twin.org/nameof";
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
							metadata: {
								"@context": "http://schema.org/",
								"@type": "Note",
								content: "This is a simple note"
							},
							aliases: [
								{
									id: "bar456",
									metadata: {
										"@context": "http://schema.org/",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									id: "foo321",
									metadata: {
										"@context": "http://schema.org/",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							],
							resources: [
								{
									id: "resource1",
									metadata: {
										"@context": "http://schema.org/",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									id: "resource2",
									metadata: {
										"@context": "http://schema.org/",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							],
							edges: [
								{
									id: "edge1",
									relationship: "frenemy",
									metadata: {
										"@context": "http://schema.org/",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									id: "edge2",
									relationship: "end",
									metadata: {
										"@context": "http://schema.org/",
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
								Location: "aig:1234567890"
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
							Accept: MimeTypes.Json
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
								id: "aig:1234567890",
								created: 1234567890,
								updated: 1234567890,
								metadata: {
									"@context": "http://schema.org/",
									"@type": "Note",
									content: "This is a simple note"
								},
								aliases: [
									{
										id: "tst:1234567890",
										created: 1234567890
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
								"@context": "https://schema.twindev.org/aig/",
								"@type": "vertex",
								id: "aig:1234567890",
								created: "2024-08-22T11:55:16.271Z",
								updated: "2024-08-22T11:55:16.271Z",
								metadata: {
									"@context": "http://schema.org/",
									"@type": "Note",
									content: "This is a simple note"
								},
								aliases: [
									{
										"@type": "alias",
										created: "2024-08-22T11:55:16.271Z",
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
							metadata: {
								"@context": "http://schema.org/",
								"@type": "Note",
								content: "This is a simple note"
							},
							aliases: [
								{
									id: "bar456",
									metadata: {
										"@context": "http://schema.org/",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									id: "foo321",
									metadata: {
										"@context": "http://schema.org/",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							],
							resources: [
								{
									id: "resource1",
									metadata: {
										"@context": "http://schema.org/",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									id: "resource2",
									metadata: {
										"@context": "http://schema.org/",
										"@type": "Note",
										content: "This is a simple note"
									}
								}
							],
							edges: [
								{
									id: "edge1",
									relationship: "frenemy",
									metadata: {
										"@context": "http://schema.org/",
										"@type": "Note",
										content: "This is a simple note"
									}
								},
								{
									id: "edge2",
									relationship: "end",
									metadata: {
										"@context": "http://schema.org/",
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
								entities: [
									{
										id: "0101010101010101010101010101010101010101010101010101010101010101",
										aliases: [
											{
												id: "foo4",
												created: 1234567890
											}
										]
									}
								],
								cursor: "1"
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
								"@context": "https://schema.twindev.org/aig/",
								"@graph": [
									{
										"@type": "vertex",
										id: "aig:1234567890",
										created: "2024-08-22T11:55:16.271Z",
										updated: "2024-08-22T11:55:16.271Z",
										metadata: {
											"@context": "http://schema.org/",
											"@type": "Note",
											content: "This is a simple note"
										},
										aliases: [
											{
												"@type": "alias",
												created: "2024-08-22T11:55:16.271Z",
												id: "tst:1234567890"
											}
										]
									}
								]
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

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);
	const id = await component.create(
		request.body?.metadata,
		request.body?.aliases,
		request.body?.resources,
		request.body?.edges,
		httpRequestContext.userIdentity,
		httpRequestContext.nodeIdentity
	);
	return {
		statusCode: HttpStatusCode.created,
		headers: {
			Location: id
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

	const mimeType = request.headers?.Accept === MimeTypes.JsonLd ? "jsonld" : "json";

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);
	const result = await component.get(
		request.pathParams.id,
		{
			includeDeleted: request.query?.includeDeleted,
			includeChangesets: request.query?.includeChangesets,
			verifySignatureDepth: request.query?.verifySignatureDepth
		},
		mimeType
	);

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

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);
	await component.update(
		request.pathParams.id,
		request.body?.metadata,
		request.body?.aliases,
		request.body?.resources,
		request.body?.edges,
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

	const component = ComponentFactory.get<IAuditableItemGraphComponent>(componentName);

	const result = await component.query(
		{
			id: request.query?.id,
			idMode: request.query?.idMode
		},
		request.query?.orderBy,
		request.query?.orderByDirection,
		request.query?.properties?.split(",") as (keyof IAuditableItemGraphVertex)[],
		request.query?.cursor,
		request.query?.pageSize
	);

	return {
		body: result
	};
}
