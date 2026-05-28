FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /srv/planixor/api
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /
COPY ["src/Codenized.Planixor.Api/Codenized.Planixor.Api.csproj", "src/Codenized.Planixor.Api/"]
COPY ["src/Codenized.Planixor.IoC/Codenized.Planixor.IoC.csproj", "src/Codenized.Planixor.IoC/"]
COPY ["src/Codenized.Planixor.Dtos/Codenized.Planixor.Dtos.csproj", "src/Codenized.Planixor.Dtos/"]
COPY ["src/Codenized.Planixor.Core/Codenized.Planixor.Core.csproj", "src/Codenized.Planixor.Core/"]
COPY ["src/Codenized.Planixor.Events/Codenized.Planixor.Events.csproj", "src/Codenized.Planixor.Events/"]
COPY ["src/Codenized.Planixor.Persistence.IoC/Codenized.Planixor.Persistence.IoC.csproj", "src/Codenized.Planixor.Persistence.IoC/"]
COPY ["src/Codenized.Planixor.Persistence.MySql.Efc.DataContext/Codenized.Planixor.Persistence.MySql.Efc.DataContext.csproj", "src/Codenized.Planixor.Persistence.MySql.Efc.DataContext/"]
COPY ["src/Codenized.Planixor.Persistence.MySql.Efc.Repositories/Codenized.Planixor.Persistence.MySql.Efc.Repositories.csproj", "src/Codenized.Planixor.Persistence.MySql.Efc.Repositories/"]
COPY ["src/Codenized.Planixor.UseCases/Codenized.Planixor.UseCases.csproj", "src/Codenized.Planixor.UseCases/"]
COPY ["src/Codenized.Planixor.Services/Codenized.Planixor.Services.csproj", "src/Codenized.Planixor.Services/"]
RUN dotnet restore "./src/Codenized.Planixor.Api/Codenized.Planixor.Api.csproj"
COPY . .
WORKDIR "/src/Codenized.Planixor.Api"
RUN dotnet build "./Codenized.Planixor.Api.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./Codenized.Planixor.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /srv/planixor/api
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "planixor-api.dll"]
