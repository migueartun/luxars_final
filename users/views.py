from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Sum
from rest_framework_simplejwt.tokens import RefreshToken

from portfolio.models import PortfolioItem
from .serializers import RegisterSerializer, UserListSerializer, ProfileSerializer

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'role': user.role,
                        'phone_number': user.phone_number,
                        'departamento': getattr(user, 'departamento', ''),
                        'ciudad': getattr(user, 'ciudad', ''),
                    },
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        username = request.data.get('username') or email
        password = request.data.get('password')

        if not password or not username:
            return Response(
                {'detail': 'Credenciales incorrectas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Intenta autenticar por username primero
        user = authenticate(request, username=username, password=password)

        # Fallback: buscar el correo (insensible a mayúsculas) y autenticar con su username
        if not user and username:
            try:
                found = User.objects.filter(email__iexact=username).first()
                if found:
                    user = authenticate(request, username=found.username, password=password)
            except User.DoesNotExist:
                pass

        if not user:
            return Response(
                {'detail': 'Credenciales incorrectas.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                    'phone_number': user.phone_number,
                    'departamento': getattr(user, 'departamento', ''),
                    'ciudad': getattr(user, 'ciudad', ''),
                },
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'token': str(refresh.access_token),
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    """
    Perfil del usuario autenticado.
    GET  → perfil completo (con avatar, bio, ubicación)
    PATCH/PUT → actualización parcial, soporta multipart para subir avatar/cover
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = ProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = ProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, *args, **kwargs):
        return self.patch(request, *args, **kwargs)


class PublicProfileView(APIView):
    """Perfil público de cualquier usuario + métricas estilo Instagram."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Perfil no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        profile = ProfileSerializer(user, context={'request': request}).data

        # Cuenta suspendida: no se exponen métricas ni obras públicas
        if getattr(user, 'is_suspended', False):
            profile['stats'] = {'works': 0, 'likes': 0, 'views': 0}
            profile['is_suspended'] = True
            return Response(profile)

        aggregates = PortfolioItem.objects.public().filter(owner=user).aggregate(
            works=Sum('likes'), likes=Sum('likes'), views=Sum('views')
        )
        works_qs = PortfolioItem.objects.public().filter(owner=user)
        profile['stats'] = {
            'works': works_qs.count(),
            'likes': aggregates.get('likes') or 0,
            'views': aggregates.get('views') or 0,
        }
        profile['is_artist'] = getattr(user, 'is_artist', user.role == User.Role.ARTIST)
        profile['is_suspended'] = False
        return Response(profile)


class UserPortfolioView(APIView):
    """Obras públicas de un usuario (para ver el perfil de otros creadores)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        from portfolio.serializers import PortfolioItemSerializer
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Perfil no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if getattr(user, 'is_suspended', False):
            return Response([])
        items = PortfolioItem.objects.public().filter(owner_id=pk)
        serializer = PortfolioItemSerializer(items, many=True, context={'request': request})
        return Response(serializer.data)


class UserListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        role = request.query_params.get('role')
        qs = User.objects.filter(is_suspended=False)
        if role:
            qs = qs.filter(role=role)
        serializer = UserListSerializer(qs[:20], many=True, context={'request': request})
        # Soporta paginación simple results
        return Response({'results': serializer.data})


class PasswordResetRequestView(APIView):
    """
    Solicita el restablecimiento de contraseña.
    Siempre responde éxito para no revelar si el correo está registrado.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        if not email:
            return Response({'detail': 'Debes indicar tu correo.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'detail': 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'})

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/reset-password?uid={uid}&token={token}"

        subject = 'Recuperación de contraseña — LuxArs'
        message = (
            f'Hola {user.username},\n\n'
            f'Para restablecer tu contraseña haz clic en el siguiente enlace:\n{reset_url}\n\n'
            f'Si no solicitaste este cambio, ignora este correo.\n\n'
            f'Equipo LuxArs'
        )
        html = (
            f'<p>Hola <strong>{user.username}</strong>,</p>'
            f'<p>Para restablecer tu contraseña <a href="{reset_url}">haz clic aquí</a>.</p>'
            f'<p>Si no solicitaste este cambio, ignora este correo.</p>'
            f'<p>Equipo LuxArs</p>'
        )
        try:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email],
                     html_message=html, fail_silently=True)
        except Exception:
            pass

        return Response({'detail': 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'})


class PasswordResetConfirmView(APIView):
    """Confirma el restablecimiento con uid + token y nueva contraseña."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password') or request.data.get('password')

        if not uidb64 or not token or not new_password:
            return Response({'detail': 'Datos incompletos.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 8:
            return Response({'detail': 'La contraseña debe tener al menos 8 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'detail': 'Enlace inválido o expirado.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'El enlace expiró o es inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.'})
