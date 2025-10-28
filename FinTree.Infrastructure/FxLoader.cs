using FinTree.Domain.ValueObjects;
using FinTree.Infrastructure.Database;
using Microsoft.Extensions.Hosting;
using Newtonsoft.Json.Linq;

namespace FinTree.Infrastructure;

public class FxLoader(AppDbContext context, HttpClient httpClient) : BackgroundService 
{
    private readonly string _url =
        "https://api.forexrateapi.com/v1/latest?api_key=288e24a304aa81b41cf582f566db8000&base=USD&currencies={0}";
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var currencies = Currency.All;
        var currencyCodes = string.Join(',', currencies.Select(c => c.Code));
        var url = string.Format(_url, currencyCodes);
        
        var result = await httpClient.GetAsync(url, stoppingToken);
        result.EnsureSuccessStatusCode();
        
        var content = await result.Content.ReadAsStringAsync(stoppingToken);
        var jObject = JObject.Parse(content);
        var rates = jObject["rates"].ToObject<Dictionary<string, decimal>>();
        var effectiveDate = DateTimeOffset.FromUnixTimeSeconds(jObject["timestamp"].ToObject<int>());

        foreach (var usdRate in rates)
        {
        }
    }
}