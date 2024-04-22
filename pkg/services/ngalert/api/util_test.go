package api

import (
	"math/rand"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
	accesscontrolmock "github.com/grafana/grafana/pkg/services/accesscontrol/mock"
	"github.com/grafana/grafana/pkg/util"
	"github.com/grafana/grafana/pkg/web"
)

func TestToMacaronPath(t *testing.T) {
	testCases := []struct {
		inputPath          string
		expectedOutputPath string
	}{
		{
			inputPath:          "",
			expectedOutputPath: "",
		},
		{
			inputPath:          "/ruler/{Recipient}/api/v1/rules/{Namespace}/{Groupname}",
			expectedOutputPath: "/ruler/:Recipient/api/v1/rules/:Namespace/:Groupname",
		},
	}
	for _, tc := range testCases {
		outputPath := toMacaronPath(tc.inputPath)
		assert.Equal(t, tc.expectedOutputPath, outputPath)
	}
}

func TestAlertingProxy_createProxyContext(t *testing.T) {
	ctx := &models.ReqContext{
		Context: &web.Context{
			Router: web.NewRouter(),
			Req:    &http.Request{},
		},
		SignedInUser:   &models.SignedInUser{},
		UserToken:      &models.UserToken{},
		IsSignedIn:     rand.Int63()%2 == 1,
		IsRenderCall:   rand.Int63()%2 == 1,
		AllowAnonymous: rand.Int63()%2 == 1,
		SkipCache:      rand.Int63()%2 == 1,
		Logger:         log.New("test"),
		RequestNonce:   util.GenerateShortUID(),
	}

	t.Run("should create a copy of request context", func(t *testing.T) {
		for _, mock := range []*accesscontrolmock.Mock{
			accesscontrolmock.New(), accesscontrolmock.New().WithDisabled(),
		} {
			proxy := AlertingProxy{
				DataProxy: nil,
				ac:        mock,
			}

			req := &http.Request{}
			resp := &response.NormalResponse{}

			newCtx := proxy.createProxyContext(ctx, req, resp)

			require.NotEqual(t, ctx, newCtx)
			require.Equal(t, ctx.UserToken, newCtx.UserToken)
			require.Equal(t, ctx.IsSignedIn, newCtx.IsSignedIn)
			require.Equal(t, ctx.IsRenderCall, newCtx.IsRenderCall)
			require.Equal(t, ctx.AllowAnonymous, newCtx.AllowAnonymous)
			require.Equal(t, ctx.SkipCache, newCtx.SkipCache)
			require.Equal(t, ctx.Logger, newCtx.Logger)
			require.Equal(t, ctx.RequestNonce, newCtx.RequestNonce)
		}
	})
	t.Run("should overwrite response writer", func(t *testing.T) {
		proxy := AlertingProxy{
			DataProxy: nil,
			ac:        accesscontrolmock.New(),
		}

		req := &http.Request{}
		resp := &response.NormalResponse{}

		newCtx := proxy.createProxyContext(ctx, req, resp)

		require.NotEqual(t, ctx.Context.Resp, newCtx.Context.Resp)
		require.Equal(t, ctx.Context.Router, newCtx.Context.Router)
		require.Equal(t, ctx.Context.Req, newCtx.Context.Req)

		require.NotEqual(t, 123, resp.Status())
		newCtx.Context.Resp.WriteHeader(123)
		require.Equal(t, 123, resp.Status())
	})
	t.Run("if access control is enabled", func(t *testing.T) {
		t.Run("should elevate permissions to Editor for Viewer", func(t *testing.T) {
			proxy := AlertingProxy{
				DataProxy: nil,
				ac:        accesscontrolmock.New(),
			}

			req := &http.Request{}
			resp := &response.NormalResponse{}

			viewerCtx := *ctx
			viewerCtx.SignedInUser = &models.SignedInUser{
				OrgRole: models.ROLE_VIEWER,
			}

			newCtx := proxy.createProxyContext(&viewerCtx, req, resp)
			require.NotEqual(t, viewerCtx.SignedInUser, newCtx.SignedInUser)
			require.Truef(t, newCtx.SignedInUser.HasRole(models.ROLE_EDITOR), "user of the proxy request should have at least Editor role but has %s", newCtx.SignedInUser.OrgRole)
		})
		t.Run("should not alter user if it is Editor", func(t *testing.T) {
			proxy := AlertingProxy{
				DataProxy: nil,
				ac:        accesscontrolmock.New(),
			}

			req := &http.Request{}
			resp := &response.NormalResponse{}

			for _, roleType := range []models.RoleType{models.ROLE_EDITOR, models.ROLE_ADMIN} {
				roleCtx := *ctx
				roleCtx.SignedInUser = &models.SignedInUser{
					OrgRole: roleType,
				}
				newCtx := proxy.createProxyContext(&roleCtx, req, resp)
				require.Equalf(t, roleCtx.SignedInUser, newCtx.SignedInUser, "user should not be altered if role is %s", roleType)
			}
		})
	})
	t.Run("if access control is disabled", func(t *testing.T) {
		t.Run("should not alter user", func(t *testing.T) {
			proxy := AlertingProxy{
				DataProxy: nil,
				ac:        accesscontrolmock.New().WithDisabled(),
			}

			req := &http.Request{}
			resp := &response.NormalResponse{}

			for _, roleType := range []models.RoleType{models.ROLE_VIEWER, models.ROLE_EDITOR, models.ROLE_ADMIN} {
				roleCtx := *ctx
				roleCtx.SignedInUser = &models.SignedInUser{
					OrgRole: roleType,
				}
				newCtx := proxy.createProxyContext(&roleCtx, req, resp)
				require.Equalf(t, roleCtx.SignedInUser, newCtx.SignedInUser, "user should not be altered if access control is disabled and role is %s", roleType)
			}
		})
	})
}
