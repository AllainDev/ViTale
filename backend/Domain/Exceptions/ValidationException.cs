using System;

namespace Domain.Exceptions;

public class ValidationException(string message) : Exception(message);
