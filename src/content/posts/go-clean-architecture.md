---
author: Tran Cuong
pubDatetime: 2026-06-07T10:00:00.000+07:00
modDatetime: 2026-06-15T10:00:00.000+07:00
title: "How I structure Go services with hexagonal architecture and feature slices"
featured: false
draft: false
tags: ["go", "architecture"]
description: "How I structure Go services with hexagonal architecture and feature slices — domain logic that stays transport-agnostic and testable without a database."
---

I do not reach for clean architecture because I like diagrams. I reach for it when I expect a Go service to live long enough that the first version of its database, transport, and package layout will eventually be wrong.

That is the idea behind `go-scaffolding`: keep the domain boring and central, and push everything external to the edge. The whole layout exists to enforce one rule — business code should not know whether it is being called by HTTP, gRPC, a CLI, or a worker.

```mermaid
flowchart LR
  HTTP[HTTP adapter] --> SP[Service port]
  GRPC[gRPC adapter] --> SP
  SP --> Domain
  SP --> RP[Repo port]
  Postgres[Postgres adapter] --> RP
```

### The practical rule

Without that constraint, transport concerns creep into service methods, and service methods creep into repository queries. By the time the codebase is large enough to feel the pain, untangling it is expensive. The arrows above only ever point inward, toward the domain, which is what keeps the outer layers swappable.

### The repository layout

Feature slices make that rule visible in the directory tree:

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

I prefer this over a global `handlers/`, `services/`, `repositories/` split because the feature stays together. If I am changing user behavior, I stay under `internal/user` and see the domain, contracts, use cases, and adapters in one place. No cross-directory hunting.

### The domain package

The domain package is where the service earns its boundaries. It has validation and business rules, but no Gin, no GORM, no config loader. Everything here is plain Go, so tests run fast and never touch the network.

```go
// internal/user/domain/user.go
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

### Ports as contracts

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

Because the interface lives next to the service — not next to the adapter — I can write and fully test the service before a single line of PostgreSQL code exists.

### The service layer

The service uses that port. This is the part I care about most in tests: duplicate-email handling, entity creation, and persistence can all be checked with a mock repository, no database booted.

```go
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

### HTTP as an adapter, not the owner

HTTP is then an adapter, not the owner of the application. The handler binds JSON, calls the service port, and maps domain errors to status codes. It does not make business decisions.

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

Each step in the `CreateUser` path crosses a boundary on purpose, so the flow stays easy to reason about.

```mermaid
flowchart LR
  Handler[Handler validates JSON] --> ServicePort[calls service port]
  ServicePort --> Duplicate[service checks duplicate email]
  Duplicate --> Entity[creates domain entity]
  Entity --> Repo[persists via repo port]
```

### The honest tradeoff

This structure has a cost. There are more files than a quick CRUD service needs, and the first setup feels like overhead. The payoff shows up later, when you can add another adapter, replace persistence, or test use cases without dragging infrastructure into every assertion.

The template is not trying to make Go abstract. It is trying to keep the parts that change from owning the parts that matter. It is the same instinct behind [the subprocess library I wrote](/posts/subprocess-go-library) — a narrow surface over a real primitive, with the sharp edges left visible.
