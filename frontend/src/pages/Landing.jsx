import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiShield, FiDollarSign, FiTrendingUp, FiUsers, FiCheckCircle } from 'react-icons/fi'
import NavBar from '../components/NavBar'

const Landing = () => {
  const features = [
    {
      icon: <FiShield className="text-4xl text-primary-600" />,
      title: 'Assured Contracts',
      description: 'Guaranteed buyers for your produce with legally binding contracts'
    },
    {
      icon: <FiDollarSign className="text-4xl text-primary-600" />,
      title: 'Stable Pricing',
      description: 'Fixed prices protect you from market fluctuations'
    },
    {
      icon: <FiTrendingUp className="text-4xl text-primary-600" />,
      title: 'Secure Payments',
      description: 'Timely payments with advance and final payment options'
    },
    {
      icon: <FiUsers className="text-4xl text-primary-600" />,
      title: 'Direct Connection',
      description: 'Connect directly with retailers, exporters, and companies'
    }
  ]

  const benefits = [
    'Reduced market risk',
    'Price transparency',
    'Digital contract management',
    'Secure payment processing',
    'Dispute resolution support',
    'Rating and review system'
  ]

  return (
    <div className="min-h-screen">
      <NavBar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-green-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Assured Contract Farming
              <span className="block text-primary-600">for Stable Market Access</span>
            </h1>
            <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
              Connect farmers with guaranteed buyers through transparent agreements, 
              stable pricing, and secure payments. Reduce market risk and stabilize your income.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary text-lg px-8 py-3">
                Get Started as Farmer
              </Link>
              <Link to="/register" className="btn-secondary text-lg px-8 py-3">
                Register as Buyer
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Why Choose Our Platform?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="card text-center hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-center mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Benefits for Farmers
              </h2>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <FiCheckCircle className="text-primary-600 text-xl" />
                    <span className="text-lg text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-lg p-8 shadow-lg"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-4">For Buyers</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <FiCheckCircle className="text-primary-600 mt-1 mr-3" />
                  <span>Access to quality produce directly from farmers</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-primary-600 mt-1 mr-3" />
                  <span>Assured supply with contract-based agreements</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-primary-600 mt-1 mr-3" />
                  <span>Transparent pricing and quality standards</span>
                </li>
                <li className="flex items-start">
                  <FiCheckCircle className="text-primary-600 mt-1 mr-3" />
                  <span>Digital contract management and tracking</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl mb-8 text-primary-100">
              Join thousands of farmers and buyers already using our platform
            </p>
            <Link to="/register" className="bg-white text-primary-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition inline-block">
              Register Now
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-400">
              © 2024 Assured Contract Farming System. All rights reserved.
            </p>
            <p className="text-gray-500 mt-2">
              S0385 - Smart Agriculture Innovation Program
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing







