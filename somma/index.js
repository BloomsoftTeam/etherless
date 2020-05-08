exports.handler = async (e) => {
  const num1 = e.params[0];
  const num2 = e.params[1];
  const sum = num1 + num2;
  
  const response = {
      statusCode: 200,
      body: JSON.stringify({'sum': sum}),
  };
  return response;
};
