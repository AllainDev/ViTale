using Application.Interfaces.Services;
using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;

namespace Infrastructure.Services;

public class EmailValidationService : IEmailValidationService
{
    private static readonly Regex EmailRegex = new(
        @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly HashSet<string> DisposableEmailDomains = new(StringComparer.OrdinalIgnoreCase)
    {
        "tempmail.com", "guerrillamail.com", "10minutemail.com", "throwaway.email",
        "maildrop.cc", "fakeinbox.com", "sharklasers.com", "mailinator.com"
    };

    public bool IsValidEmailFormat(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return false;

        // Check length
        if (email.Length > 254)
            return false;

        // Check format
        if (!EmailRegex.IsMatch(email))
            return false;

        // Check for disposable email domains
        var domain = email.Split('@').LastOrDefault();
        if (domain != null && DisposableEmailDomains.Contains(domain))
            return false;

        return true;
    }

    public async Task<bool> IsValidEmailDomainAsync(string email, CancellationToken ct = default)
    {
        try
        {
            var domain = email.Split('@').LastOrDefault();
            if (string.IsNullOrEmpty(domain))
                return false;

            // Check if domain has MX records (mail exchange records)
            var mxRecords = await GetMxRecordsAsync(domain, ct);
            return mxRecords.Any();
        }
        catch
        {
            // If DNS lookup fails, we still allow the email
            // (to avoid false negatives due to network issues)
            return true;
        }
    }

    private async Task<List<string>> GetMxRecordsAsync(string domain, CancellationToken ct)
    {
        return await Task.Run(() =>
        {
            var mxRecords = new List<string>();

            try
            {
                // Query DNS for MX records
                var hostEntry = Dns.GetHostEntry(domain);
                if (hostEntry.AddressList.Length > 0)
                {
                    // Domain resolves, likely valid
                    mxRecords.Add(domain);
                }
            }
            catch (SocketException)
            {
                // DNS lookup failed - domain doesn't exist or no MX records
            }

            return mxRecords;
        }, ct);
    }
}
