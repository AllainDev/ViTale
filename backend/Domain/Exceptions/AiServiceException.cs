using System;

namespace Domain.Exceptions;

public class AiServiceException(string message) : Exception(message);
