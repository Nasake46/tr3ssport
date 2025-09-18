const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const stripe = Stripe(''); // Remplace avec ta clé secrète Stripe

const app = express();
app.use(cors());
app.use(express.json());

const DOMAIN = 'http://localhost:3000'; // Ou ton domaine frontend

app.post('/create-checkout-session', async (req, res) => {
  const { subscriptionId } = req.body;

  // Simule les produits
  const prices = {
    basic: 1000,
    premium: 2500,
  };

  const name = subscriptionId === 'basic' ? 'Abonnement Basic' : 'Abonnement Premium';

  if (!prices[subscriptionId]) {
    return res.status(400).json({ error: 'Abonnement inconnu.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name,
            },
            unit_amount: prices[subscriptionId],
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${DOMAIN}/success`,
      cancel_url: `${DOMAIN}/cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Erreur Stripe:', err);
    res.status(500).json({ error: 'Erreur serveur Stripe' });
  }
});

app.listen(4242, () => console.log('Stripe server running on http://localhost:4242'));

// Ajoute ceci à ton server.js
app.post('/pay-coach', async (req, res) => {
  const { coachId, amount } = req.body;

  const coachMap = {
    coach_1: 'Marie Dupont',
    coach_2: 'Alex Bernard',
  };

  if (!coachMap[coachId] || !amount || amount < 50) {
    return res.status(400).json({ error: 'Données invalides' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Rémunération pour ${coachMap[coachId]}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: 'http://localhost:3000/success', // à adapter
      cancel_url: 'http://localhost:3000/cancel',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Erreur Stripe:', err);
    res.status(500).json({ error: 'Erreur serveur Stripe' });
  }
});

