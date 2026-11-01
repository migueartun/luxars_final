from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0002_review'),
    ]

    operations = [
        migrations.AlterField(
            model_name='booking',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pendiente'),
                    ('accepted', 'Confirmada'),
                    ('rejected', 'Rechazada'),
                    ('completed', 'Finalizada'),
                    ('cancelled', 'Cancelada'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
    ]
