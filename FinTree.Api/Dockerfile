FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["FinTree.Api/FinTree.Api.csproj", "FinTree.Api/"]
COPY ["FinTree.Application/FinTree.Application.csproj", "FinTree.Application/"]
COPY ["FinTree.Infrastructure/FinTree.Infrastructure.csproj", "FinTree.Infrastructure/"]
COPY ["FinTree.Domain/FinTree.Domain.csproj", "FinTree.Domain/"]
RUN dotnet restore "FinTree.Api/FinTree.Api.csproj"
COPY . .
WORKDIR "/src/FinTree.Api"
RUN dotnet build "./FinTree.Api.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./FinTree.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "FinTree.Api.dll"]
