using System;

namespace Domain.Exceptions;

public class ConflictException(string message) : Exception(message);
