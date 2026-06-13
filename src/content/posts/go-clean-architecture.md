---
author: Tran Cuong
pubDatetime: 2026-06-07T10:00:00.000+07:00
modDatetime:
title: "How I structure Go services with hexagonal architecture and feature slices"
featured: false
draft: false
tags: ["go", "architecture"]
description: "How I structure Go services around domain code, ports, adapters, and boring testable boundaries."
---

I do not reach for clean architecture because I like diagrams. I reach for it when I expect a Go service to live long enough that the first version of its database, transport, and package layout will eventually be wrong.

That is the reason behind `go-scaffolding`. It is a template for services where the domain is kept boring and central, and everything external is pushed to the edge. The README describes it as hexagonal architecture with a feature-sliced structure, but the practical rule is simpler: business code should not know whether it is being called by HTTP, gRPC, a CLI, or a worker.

```mermaid
flowchart LR
  HTTP[HTTP adapter] --> SP[Service port]
  GRPC[gRPC adapter] --> SP
  SP --> Domain
  SP --> RP[Repo port]
  Postgres[Postgres adapter] --> RP
```

The repository layout makes that rule visible:

```text
internal/
└── user/
    ├── domain/
    ├── ports/
    ├── service/
    └── adapters/
        ├── postgres/
        └── http/
```

I prefer this over a global `handlers/`, `services/`, `repositories/` split because the feature stays together. If I am changing user behavior, I can stay under `internal/user` and see the domain, contracts, use cases, and adapters in one place.

The domain package is where the service earns its boundaries. It has validation and business rules, but no Gin, no GORM, no config loader.

```go
// internal/user/domain/user.go
type User struct {
	ID        string
	Email     string
	Name      string
	CreatedAt time.Time
	UpdatedAt time.Time
}

func NewUser(email, name string) (*User, error) {
	if !isValidEmail(email) {
		return nil, ErrInvalidEmail
	}

	name = strings.TrimSpace(name)
	if err := isValidName(name); err != nil {
		return nil, err
	}

	now := time.Now()
	return &User{
		ID:        uuid.New().String(),
		Email:     email,
		Name:      name,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}
```

The ports package defines what the rest of the feature is allowed to depend on. The repository is an output port: the service needs persistence, but it does not need to know that PostgreSQL is behind it.

```go
// internal/user/ports/repository.go
type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	GetByID(ctx context.Context, id string) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	Update(ctx context.Context, user *domain.User) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, limit, offset int) ([]*domain.User, error)
}
```

The service uses that port. This is the part I care about most in tests: duplicate email handling, entity creation, and persistence orchestration can be tested with a mock repository without booting a database.

```go
type UserService struct {
	repo ports.UserRepository
}

func NewUserService(repo ports.UserRepository) ports.UserService {
	return &UserService{repo: repo}
}

func (s *UserService) CreateUser(ctx context.Context, email, name string) (*domain.User, error) {
	_, err := s.repo.GetByEmail(ctx, email)
	if err == nil {
		return nil, domain.ErrDuplicateEmail
	}
	if !errors.Is(err, domain.ErrUserNotFound) {
		return nil, err
	}

	user, err := domain.NewUser(email, name)
	if err != nil {
		return nil, err
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}
```

HTTP then becomes an adapter, not the owner of the application. The handler binds JSON, calls the service port, and maps domain errors to status codes.

```go
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req CreateUserRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	user, err := h.userService.CreateUser(c.Request.Context(), req.Email, req.Name)
	if err != nil {
		statusCode, errorMsg := mapDomainErrorToHTTP(err)
		c.JSON(statusCode, ErrorResponse{Error: errorMsg})
		return
	}

	c.JSON(http.StatusCreated, ToUserResponse(user))
}
```

The `CreateUser` path stays easy to reason about because each step crosses a boundary on purpose.

```mermaid
flowchart LR
  Handler[Handler validates JSON] --> ServicePort[calls service port]
  ServicePort --> Duplicate[service checks duplicate email]
  Duplicate --> Entity[creates domain entity]
  Entity --> Repo[persists via repo port]
```

This structure has a cost. There are more files than a quick CRUD service needs. But the payoff shows up later, when I can add another adapter, replace persistence, or test use cases without dragging infrastructure into every assertion. The template is not trying to make Go abstract. It is trying to keep the parts that change from owning the parts that matter.
