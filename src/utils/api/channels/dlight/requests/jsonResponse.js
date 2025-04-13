export const createJsonRpcResponse = (id, result, error) => {
  const responseData = {
    jsonrpc: "2.0",
    id: id,
  }

  if (error) {
    responseData.error = error;
  } else {
    console.error("result in createJsonResponse: " + JSON.stringify(result));
    responseData.result = result;
  }
  const response = new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    },
  });
  console.error("responseData: " + JSON.stringify(responseData));
  return response.json()
}
