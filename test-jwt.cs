using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.Collections.Generic;

class Program {
    static void Main() {
        var secret = "CHANGE_ME_TO_A_64_CHARACTER_CRYPTOGRAPHICALLY_SECURE_RANDOM_STRING";
        var travelerId = "1f3f9480-2c30-4ad6-8583-be82e467be04";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var claims = new List<Claim> {
            new Claim("tid", travelerId),
            new Claim("is_registered", "true"),
            new Claim(JwtRegisteredClaimNames.Email, "blablovcl@gmail.com")
        };
        
        var token = new JwtSecurityToken(
            issuer: "vitale.vn",
            audience: "app.vitale.vn",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(1),
            signingCredentials: creds
        );
        Console.WriteLine(new JwtSecurityTokenHandler().WriteToken(token));
    }
}
